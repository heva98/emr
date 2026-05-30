from datetime import date

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone


class Patient(models.Model):
    class Gender(models.TextChoices):
        MALE = 'M', 'Male'
        FEMALE = 'F', 'Female'
        OTHER = 'OTHER', 'Other'

    class BloodGroup(models.TextChoices):
        A_POS = 'A_POS', 'A+'
        A_NEG = 'A_NEG', 'A-'
        B_POS = 'B_POS', 'B+'
        B_NEG = 'B_NEG', 'B-'
        AB_POS = 'AB_POS', 'AB+'
        AB_NEG = 'AB_NEG', 'AB-'
        O_POS = 'O_POS', 'O+'
        O_NEG = 'O_NEG', 'O-'
        UNKNOWN = 'UNKNOWN', 'Unknown'

    patient_id = models.CharField(max_length=20, unique=True, blank=True, editable=False)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=5, choices=Gender.choices)
    national_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    phone_primary = models.CharField(max_length=20)
    phone_secondary = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    address_street = models.CharField(max_length=200)
    address_city = models.CharField(max_length=100)
    address_district = models.CharField(max_length=100)
    address_region = models.CharField(max_length=100)
    next_of_kin_name = models.CharField(max_length=200, blank=True)
    next_of_kin_phone = models.CharField(max_length=20, blank=True)
    next_of_kin_relationship = models.CharField(max_length=100, blank=True)
    blood_group = models.CharField(
        max_length=10, choices=BloodGroup.choices, default=BloodGroup.UNKNOWN
    )
    allergies = models.TextField(blank=True)
    chronic_conditions = models.TextField(blank=True)
    photo = models.ImageField(upload_to='patient_photos/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    registered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='registered_patients',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.patient_id} — {self.first_name} {self.last_name}"

    @transaction.atomic
    def save(self, *args, **kwargs):
        if not self.patient_id:
            year = timezone.now().year
            last = (
                Patient.objects.select_for_update()
                .filter(patient_id__startswith=f'P-{year}-')
                .order_by('patient_id')
                .last()
            )
            seq = int(last.patient_id.split('-')[-1]) + 1 if last else 1
            self.patient_id = f'P-{year}-{seq:05d}'
        super().save(*args, **kwargs)


class PatientVisit(models.Model):
    class VisitType(models.TextChoices):
        OPD = 'OPD', 'OPD'
        EMERGENCY = 'EMERGENCY', 'Emergency'
        FOLLOW_UP = 'FOLLOW_UP', 'Follow-Up'

    class Status(models.TextChoices):
        WAITING = 'WAITING', 'Waiting'
        TRIAGE_DONE = 'TRIAGE_DONE', 'Triage Done'
        WITH_DOCTOR = 'WITH_DOCTOR', 'With Doctor'
        LAB_PENDING = 'LAB_PENDING', 'Lab Pending'
        PHARMACY_PENDING = 'PHARMACY_PENDING', 'Pharmacy Pending'
        BILLING_PENDING = 'BILLING_PENDING', 'Billing Pending'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    visit_number = models.CharField(max_length=20, unique=True, blank=True, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name='visits')
    visit_date = models.DateField(default=date.today)
    visit_type = models.CharField(max_length=20, choices=VisitType.choices)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.WAITING
    )
    triage_level = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        choices=[(i, str(i)) for i in range(1, 6)],
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_visits',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-visit_date', '-created_at']

    def __str__(self):
        return f"{self.visit_number} — {self.patient}"

    @transaction.atomic
    def save(self, *args, **kwargs):
        if not self.visit_number:
            year = timezone.now().year
            last = (
                PatientVisit.objects.select_for_update()
                .filter(visit_number__startswith=f'V-{year}-')
                .order_by('visit_number')
                .last()
            )
            seq = int(last.visit_number.split('-')[-1]) + 1 if last else 1
            self.visit_number = f'V-{year}-{seq:05d}'
        super().save(*args, **kwargs)
