from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.patients.models import PatientVisit


class Triage(models.Model):
    visit = models.OneToOneField(
        PatientVisit, on_delete=models.PROTECT, related_name='triage'
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='triages_recorded',
    )
    recorded_at = models.DateTimeField(auto_now_add=True)
    weight_kg = models.DecimalField(max_digits=4, decimal_places=1)
    height_cm = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    bmi = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, editable=False)
    temperature_celsius = models.DecimalField(max_digits=3, decimal_places=1)
    blood_pressure_systolic = models.IntegerField(null=True, blank=True)
    blood_pressure_diastolic = models.IntegerField(null=True, blank=True)
    pulse_rate = models.IntegerField(null=True, blank=True)
    respiratory_rate = models.IntegerField(null=True, blank=True)
    oxygen_saturation = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )

    class Meta:
        ordering = ['recorded_at']

    def __str__(self):
        return f"Triage — {self.visit}"

    def save(self, *args, **kwargs):
        if self.weight_kg and self.height_cm and float(self.height_cm) > 0:
            h_m = float(self.height_cm) / 100
            self.bmi = round(float(self.weight_kg) / (h_m ** 2), 1)
        super().save(*args, **kwargs)


@receiver(post_save, sender=Triage)
def _triage_post_save(sender, instance, created, **kwargs):
    if created:
        visit = instance.visit
        visit.status = PatientVisit.Status.TRIAGE_DONE
        visit.save()


class Consultation(models.Model):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        COMPLETED = 'COMPLETED', 'Completed'
        SIGNED_OFF = 'SIGNED_OFF', 'Signed Off'

    visit = models.OneToOneField(
        PatientVisit, on_delete=models.PROTECT, related_name='consultation'
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='consultations',
        limit_choices_to={'role': 'DOCTOR'},
    )
    room = models.ForeignKey(
        'rooms.Room',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='consultations',
    )
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    history_of_presenting_illness = models.TextField()
    review_of_systems = models.TextField(blank=True)
    examination_findings = models.TextField()
    diagnosis_primary = models.TextField()
    diagnosis_secondary = models.TextField(blank=True)
    icd10_codes = models.JSONField(default=list)
    clinical_notes = models.TextField(blank=True)
    plan = models.TextField()
    follow_up_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"Consultation — {self.visit}"


@receiver(post_save, sender=Consultation)
def _consultation_post_save(sender, instance, created, **kwargs):
    if created:
        visit = instance.visit
        visit.status = PatientVisit.Status.WITH_DOCTOR
        visit.save()


class Referral(models.Model):
    class ReferredTo(models.TextChoices):
        LAB = 'LAB', 'Laboratory'
        PHARMACY = 'PHARMACY', 'Pharmacy'
        CASHIER = 'CASHIER', 'Cashier'
        RADIOLOGY = 'RADIOLOGY', 'Radiology'
        SPECIALIST = 'SPECIALIST', 'Specialist'
        ADMISSION = 'ADMISSION', 'Admission'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'

    consultation = models.ForeignKey(
        Consultation, on_delete=models.PROTECT, related_name='referrals'
    )
    referred_to = models.CharField(max_length=20, choices=ReferredTo.choices)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Referral → {self.referred_to} ({self.consultation})"


_REFERRAL_STATUS_MAP = {
    'CASHIER': PatientVisit.Status.BILLING_PENDING,
    'LAB': PatientVisit.Status.LAB_PENDING,
    'PHARMACY': PatientVisit.Status.PHARMACY_PENDING,
}


@receiver(post_save, sender=Referral)
def _referral_post_save(sender, instance, created, **kwargs):
    if created:
        new_status = _REFERRAL_STATUS_MAP.get(instance.referred_to)
        if new_status:
            visit = instance.consultation.visit
            visit.status = new_status
            visit.save()

        if instance.referred_to == 'CASHIER':
            from apps.cashier.models import Invoice
            visit = instance.consultation.visit
            Invoice.objects.get_or_create(
                visit=visit,
                defaults={
                    'patient': visit.patient,
                    'created_by': instance.consultation.doctor,
                },
            )
