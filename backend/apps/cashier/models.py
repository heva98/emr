from django.conf import settings
from django.db import models, transaction
from django.db.models import Sum
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone


class ServiceCatalog(models.Model):
    class ServiceType(models.TextChoices):
        CONSULTATION = 'CONSULTATION', 'Consultation'
        LAB = 'LAB', 'Laboratory'
        PHARMACY = 'PHARMACY', 'Pharmacy'
        PROCEDURE = 'PROCEDURE', 'Procedure'
        OTHER = 'OTHER', 'Other'

    name = models.CharField(max_length=200)
    service_type = models.CharField(max_length=20, choices=ServiceType.choices)
    unit_price = models.IntegerField(help_text='Price in TZS')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['service_type', 'name']

    def __str__(self):
        return f"{self.name} ({self.service_type})"


class Invoice(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        ISSUED = 'ISSUED', 'Issued'
        PAID = 'PAID', 'Paid'
        CANCELLED = 'CANCELLED', 'Cancelled'

    invoice_number = models.CharField(max_length=20, unique=True, blank=True, editable=False)
    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.PROTECT, related_name='invoices'
    )
    visit = models.ForeignKey(
        'patients.PatientVisit', on_delete=models.PROTECT, related_name='invoices'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='invoices_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    subtotal = models.IntegerField(default=0, help_text='Sum of line items in TZS')
    discount_amount = models.IntegerField(default=0, help_text='Discount in TZS')
    total_amount = models.IntegerField(default=0, help_text='Subtotal minus discount in TZS')
    amount_paid = models.IntegerField(default=0, help_text='Total payments received in TZS')
    balance_due = models.IntegerField(default=0, help_text='Total minus amount paid in TZS')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.invoice_number} — {self.patient}"

    @transaction.atomic
    def save(self, *args, **kwargs):
        if not self.invoice_number:
            year = timezone.now().year
            last = (
                Invoice.objects.select_for_update()
                .filter(invoice_number__startswith=f'INV-{year}-')
                .order_by('invoice_number')
                .last()
            )
            seq = int(last.invoice_number.split('-')[-1]) + 1 if last else 1
            self.invoice_number = f'INV-{year}-{seq:05d}'
        # Always derive computed fields so callers only need to set subtotal / discount / amount_paid
        self.total_amount = max(0, self.subtotal - self.discount_amount)
        self.balance_due = max(0, self.total_amount - self.amount_paid)
        if (
            self.balance_due == 0
            and self.amount_paid > 0
            and self.status not in (self.Status.CANCELLED, self.Status.PAID)
        ):
            self.status = self.Status.PAID
        super().save(*args, **kwargs)


class InvoiceItem(models.Model):
    class ReferenceType(models.TextChoices):
        CONSULTATION = 'CONSULTATION', 'Consultation'
        LAB = 'LAB', 'Laboratory'
        PHARMACY = 'PHARMACY', 'Pharmacy'
        MANUAL = 'MANUAL', 'Manual'

    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name='items')
    description = models.CharField(max_length=300)
    service_catalog = models.ForeignKey(
        ServiceCatalog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_items',
    )
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.IntegerField(help_text='Unit price in TZS')
    subtotal = models.IntegerField(editable=False, help_text='quantity × unit_price in TZS')
    reference_type = models.CharField(
        max_length=20, choices=ReferenceType.choices, default=ReferenceType.MANUAL
    )
    reference_id = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ['reference_type', 'id']

    def __str__(self):
        return f"{self.description} × {self.quantity}"

    def save(self, *args, **kwargs):
        self.subtotal = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class Payment(models.Model):
    class PaymentMethod(models.TextChoices):
        CASH = 'CASH', 'Cash'
        MOBILE_MONEY = 'MOBILE_MONEY', 'Mobile Money'

    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name='payments')
    amount = models.IntegerField(help_text='Amount in TZS')
    payment_method = models.CharField(max_length=15, choices=PaymentMethod.choices)
    mobile_money_reference = models.CharField(max_length=50, blank=True)
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='payments_received',
    )
    received_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-received_at']

    def __str__(self):
        return f"{self.amount} TZS ({self.payment_method}) — {self.invoice.invoice_number}"


@receiver(post_save, sender=Payment)
def _payment_post_save(sender, instance, created, **kwargs):
    if not created:
        return
    with transaction.atomic():
        total_paid = (
            Payment.objects.filter(invoice_id=instance.invoice_id)
            .aggregate(total=Sum('amount'))['total'] or 0
        )
        invoice = Invoice.objects.select_for_update().get(pk=instance.invoice_id)
        invoice.amount_paid = total_paid
        invoice.save()  # save() auto-derives balance_due and flips status to PAID
