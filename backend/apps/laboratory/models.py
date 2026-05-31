from django.conf import settings
from django.db import models, transaction
from django.utils import timezone


class LabTestCatalog(models.Model):
    class Category(models.TextChoices):
        HAEMATOLOGY = 'HAEMATOLOGY', 'Haematology'
        BIOCHEMISTRY = 'BIOCHEMISTRY', 'Biochemistry'
        MICROBIOLOGY = 'MICROBIOLOGY', 'Microbiology'
        SEROLOGY = 'SEROLOGY', 'Serology'
        URINALYSIS = 'URINALYSIS', 'Urinalysis'
        OTHER = 'OTHER', 'Other'

    class SpecimenType(models.TextChoices):
        BLOOD = 'BLOOD', 'Blood'
        URINE = 'URINE', 'Urine'
        STOOL = 'STOOL', 'Stool'
        SWAB = 'SWAB', 'Swab'
        OTHER = 'OTHER', 'Other'

    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    category = models.CharField(max_length=20, choices=Category.choices)
    specimen_type = models.CharField(max_length=10, choices=SpecimenType.choices)
    normal_range_description = models.TextField(blank=True)
    unit = models.CharField(max_length=30, blank=True)
    turnaround_hours = models.IntegerField(default=24)
    price = models.IntegerField(help_text='Price in TZS')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.code} — {self.name}"


class LabOrder(models.Model):
    class Priority(models.TextChoices):
        ROUTINE = 'ROUTINE', 'Routine'
        URGENT = 'URGENT', 'Urgent'
        STAT = 'STAT', 'STAT'

    class Status(models.TextChoices):
        ORDERED = 'ORDERED', 'Ordered'
        SPECIMEN_COLLECTED = 'SPECIMEN_COLLECTED', 'Specimen Collected'
        PROCESSING = 'PROCESSING', 'Processing'
        RESULTED = 'RESULTED', 'Resulted'
        VERIFIED = 'VERIFIED', 'Verified'
        CANCELLED = 'CANCELLED', 'Cancelled'

    order_number = models.CharField(max_length=20, unique=True, blank=True, editable=False)
    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.PROTECT, related_name='lab_orders'
    )
    visit = models.ForeignKey(
        'patients.PatientVisit', on_delete=models.PROTECT, related_name='lab_orders'
    )
    ordered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='lab_orders_created',
    )
    ordered_at = models.DateTimeField(auto_now_add=True)
    priority = models.CharField(
        max_length=10, choices=Priority.choices, default=Priority.ROUTINE
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ORDERED
    )
    clinical_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-ordered_at']

    def __str__(self):
        return f"{self.order_number} — {self.patient}"

    @transaction.atomic
    def save(self, *args, **kwargs):
        if not self.order_number:
            year = timezone.now().year
            last = (
                LabOrder.objects.select_for_update()
                .filter(order_number__startswith=f'LB-{year}-')
                .order_by('order_number')
                .last()
            )
            seq = int(last.order_number.split('-')[-1]) + 1 if last else 1
            self.order_number = f'LB-{year}-{seq:05d}'
        super().save(*args, **kwargs)


class LabOrderItem(models.Model):
    class Status(models.TextChoices):
        ORDERED = 'ORDERED', 'Ordered'
        SPECIMEN_COLLECTED = 'SPECIMEN_COLLECTED', 'Specimen Collected'
        PROCESSING = 'PROCESSING', 'Processing'
        RESULTED = 'RESULTED', 'Resulted'
        VERIFIED = 'VERIFIED', 'Verified'
        CANCELLED = 'CANCELLED', 'Cancelled'

    order = models.ForeignKey(LabOrder, on_delete=models.PROTECT, related_name='items')
    test = models.ForeignKey(
        LabTestCatalog, on_delete=models.PROTECT, related_name='order_items'
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ORDERED
    )
    specimen_collected_at = models.DateTimeField(null=True, blank=True)
    collected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='specimens_collected',
    )

    class Meta:
        ordering = ['test__name']
        unique_together = [('order', 'test')]

    def __str__(self):
        return f"{self.order.order_number} — {self.test.code}"


class LabResult(models.Model):
    class Flag(models.TextChoices):
        NORMAL = 'NORMAL', 'Normal'
        LOW = 'LOW', 'Low'
        HIGH = 'HIGH', 'High'
        CRITICAL_LOW = 'CRITICAL_LOW', 'Critical Low'
        CRITICAL_HIGH = 'CRITICAL_HIGH', 'Critical High'
        POSITIVE = 'POSITIVE', 'Positive'
        NEGATIVE = 'NEGATIVE', 'Negative'
        NOT_DONE = 'NOT_DONE', 'Not Done'

    order_item = models.OneToOneField(
        LabOrderItem, on_delete=models.PROTECT, related_name='result'
    )
    result_value = models.TextField()
    result_numeric = models.FloatField(null=True, blank=True)
    normal_low = models.FloatField(null=True, blank=True)
    normal_high = models.FloatField(null=True, blank=True)
    flag = models.CharField(max_length=15, choices=Flag.choices, default=Flag.NORMAL)
    resulted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='lab_results_entered',
    )
    resulted_at = models.DateTimeField(auto_now_add=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lab_results_verified',
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['order_item__test__name']

    def __str__(self):
        return f"Result — {self.order_item}"

    def save(self, *args, **kwargs):
        try:
            self.result_numeric = float(self.result_value)
        except (ValueError, TypeError):
            self.result_numeric = None
        super().save(*args, **kwargs)
