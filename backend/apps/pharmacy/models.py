from django.conf import settings
from django.db import models, transaction
from django.utils import timezone


class Drug(models.Model):
    class Formulation(models.TextChoices):
        TABLET = 'TABLET', 'Tablet'
        CAPSULE = 'CAPSULE', 'Capsule'
        SYRUP = 'SYRUP', 'Syrup'
        INJECTION = 'INJECTION', 'Injection'
        CREAM = 'CREAM', 'Cream'
        DROPS = 'DROPS', 'Drops'
        SUPPOSITORY = 'SUPPOSITORY', 'Suppository'
        OTHER = 'OTHER', 'Other'

    class Category(models.TextChoices):
        ANTIBIOTIC = 'ANTIBIOTIC', 'Antibiotic'
        ANALGESIC = 'ANALGESIC', 'Analgesic'
        ANTIHYPERTENSIVE = 'ANTIHYPERTENSIVE', 'Antihypertensive'
        ANTIDIABETIC = 'ANTIDIABETIC', 'Antidiabetic'
        ANTIMALARIAL = 'ANTIMALARIAL', 'Antimalarial'
        GI = 'GI', 'Gastrointestinal'
        VITAMIN = 'VITAMIN', 'Vitamin / Supplement'
        IV_FLUID = 'IV_FLUID', 'IV Fluid'
        OTHER = 'OTHER', 'Other'

    drug_code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    brand_name = models.CharField(max_length=200, blank=True)
    formulation = models.CharField(max_length=15, choices=Formulation.choices)
    strength = models.CharField(max_length=50)
    unit_of_measure = models.CharField(max_length=30)
    category = models.CharField(max_length=20, choices=Category.choices)
    requires_prescription = models.BooleanField(default=True)
    is_controlled_substance = models.BooleanField(default=False)
    reorder_level = models.IntegerField(default=10)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.drug_code} — {self.name} {self.strength}"


class StockItem(models.Model):
    class Location(models.TextChoices):
        MAIN_STORE = 'MAIN_STORE', 'Main Store'
        DISPENSING = 'DISPENSING', 'Dispensing'

    drug = models.ForeignKey(Drug, on_delete=models.PROTECT, related_name='stock_items')
    batch_number = models.CharField(max_length=50)
    expiry_date = models.DateField()
    quantity_in_stock = models.IntegerField(default=0)
    unit_cost = models.IntegerField(help_text='Unit cost in TZS')
    selling_price = models.IntegerField(help_text='Selling price in TZS')
    supplier = models.CharField(max_length=200, blank=True)
    location = models.CharField(
        max_length=15, choices=Location.choices, default=Location.MAIN_STORE
    )
    received_at = models.DateTimeField(auto_now_add=True)
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='stock_items_received',
    )

    class Meta:
        ordering = ['drug__name', 'expiry_date']
        unique_together = [('drug', 'batch_number', 'location')]

    def __str__(self):
        return f"{self.drug.name} — Batch {self.batch_number} ({self.location})"


class StockMovement(models.Model):
    class MovementType(models.TextChoices):
        RECEIVE = 'RECEIVE', 'Receive'
        DISPENSE = 'DISPENSE', 'Dispense'
        TRANSFER_TO_DISPENSING = 'TRANSFER_TO_DISPENSING', 'Transfer to Dispensing'
        ADJUSTMENT = 'ADJUSTMENT', 'Adjustment'
        RETURN = 'RETURN', 'Return'
        EXPIRED = 'EXPIRED', 'Expired'

    stock_item = models.ForeignKey(
        StockItem, on_delete=models.PROTECT, related_name='movements'
    )
    movement_type = models.CharField(max_length=25, choices=MovementType.choices)
    quantity = models.IntegerField(help_text='Positive = stock in, Negative = stock out')
    reference_number = models.CharField(max_length=30, blank=True)
    moved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='stock_movements',
    )
    moved_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-moved_at']

    def __str__(self):
        return f"{self.movement_type} {self.quantity:+d} — {self.stock_item}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            StockItem.objects.filter(pk=self.stock_item_id).update(
                quantity_in_stock=models.F('quantity_in_stock') + self.quantity
            )


class Prescription(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PARTIALLY_DISPENSED = 'PARTIALLY_DISPENSED', 'Partially Dispensed'
        DISPENSED = 'DISPENSED', 'Dispensed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    prescription_number = models.CharField(
        max_length=20, unique=True, blank=True, editable=False
    )
    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.PROTECT, related_name='prescriptions'
    )
    visit = models.ForeignKey(
        'patients.PatientVisit', on_delete=models.PROTECT, related_name='prescriptions'
    )
    prescribed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='prescriptions_written',
    )
    prescribed_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-prescribed_at']

    def __str__(self):
        return f"{self.prescription_number} — {self.patient}"

    @transaction.atomic
    def save(self, *args, **kwargs):
        if not self.prescription_number:
            year = timezone.now().year
            last = (
                Prescription.objects.select_for_update()
                .filter(prescription_number__startswith=f'RX-{year}-')
                .order_by('prescription_number')
                .last()
            )
            seq = int(last.prescription_number.split('-')[-1]) + 1 if last else 1
            self.prescription_number = f'RX-{year}-{seq:05d}'
        super().save(*args, **kwargs)


class PrescriptionItem(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PARTIALLY_DISPENSED = 'PARTIALLY_DISPENSED', 'Partially Dispensed'
        DISPENSED = 'DISPENSED', 'Dispensed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    prescription = models.ForeignKey(
        Prescription, on_delete=models.PROTECT, related_name='items'
    )
    drug = models.ForeignKey(
        Drug, on_delete=models.PROTECT, related_name='prescription_items'
    )
    dose = models.CharField(max_length=50)
    frequency = models.CharField(max_length=100)
    duration = models.CharField(max_length=100)
    instructions = models.CharField(max_length=200, blank=True)
    quantity_prescribed = models.IntegerField()
    quantity_dispensed = models.IntegerField(default=0)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )

    class Meta:
        ordering = ['drug__name']

    def __str__(self):
        return f"{self.prescription.prescription_number} — {self.drug.name}"


class Dispensing(models.Model):
    prescription_item = models.ForeignKey(
        PrescriptionItem, on_delete=models.PROTECT, related_name='dispensings'
    )
    stock_item = models.ForeignKey(
        StockItem, on_delete=models.PROTECT, related_name='dispensings'
    )
    quantity_dispensed = models.IntegerField()
    dispensed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='dispensings',
    )
    dispensed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-dispensed_at']

    def __str__(self):
        return f"Dispensed {self.quantity_dispensed} × {self.prescription_item.drug.name}"

    @transaction.atomic
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if not is_new:
            return

        # Create stock movement (also decrements stock_item.quantity_in_stock via F())
        StockMovement.objects.create(
            stock_item=self.stock_item,
            movement_type=StockMovement.MovementType.DISPENSE,
            quantity=-self.quantity_dispensed,
            reference_number=self.prescription_item.prescription.prescription_number,
            moved_by=self.dispensed_by,
        )

        # Update prescription item quantity and status
        item = PrescriptionItem.objects.select_for_update().get(pk=self.prescription_item_id)
        item.quantity_dispensed += self.quantity_dispensed
        if item.quantity_dispensed >= item.quantity_prescribed:
            item.status = PrescriptionItem.Status.DISPENSED
        else:
            item.status = PrescriptionItem.Status.PARTIALLY_DISPENSED
        PrescriptionItem.objects.filter(pk=item.pk).update(
            quantity_dispensed=item.quantity_dispensed,
            status=item.status,
        )

        # Update prescription status based on all items
        all_items = list(
            PrescriptionItem.objects.filter(prescription_id=item.prescription_id)
        )
        active_items = [i for i in all_items if i.status != PrescriptionItem.Status.CANCELLED]
        if active_items and all(
            i.status == PrescriptionItem.Status.DISPENSED for i in active_items
        ):
            new_prescription_status = Prescription.Status.DISPENSED
        elif any(
            i.status in (PrescriptionItem.Status.DISPENSED, PrescriptionItem.Status.PARTIALLY_DISPENSED)
            for i in active_items
        ):
            new_prescription_status = Prescription.Status.PARTIALLY_DISPENSED
        else:
            return

        Prescription.objects.filter(pk=item.prescription_id).update(
            status=new_prescription_status
        )
