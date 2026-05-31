from django.conf import settings
from django.db import models


class Department(models.Model):
    class DeptName(models.TextChoices):
        OPD = 'OPD', 'OPD'
        LABORATORY = 'LABORATORY', 'Laboratory'
        PHARMACY = 'PHARMACY', 'Pharmacy'
        RADIOLOGY = 'RADIOLOGY', 'Radiology'
        WARD = 'WARD', 'Ward'
        ADMINISTRATION = 'ADMINISTRATION', 'Administration'
        OTHER = 'OTHER', 'Other'

    name = models.CharField(max_length=20, choices=DeptName.choices, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.get_name_display()


class Room(models.Model):
    class RoomType(models.TextChoices):
        CONSULTATION = 'CONSULTATION', 'Consultation'
        PROCEDURE = 'PROCEDURE', 'Procedure'
        LAB_BENCH = 'LAB_BENCH', 'Lab Bench'
        DISPENSING = 'DISPENSING', 'Dispensing'
        CASHIER_DESK = 'CASHIER_DESK', 'Cashier Desk'
        WARD_BED = 'WARD_BED', 'Ward Bed'
        STORE = 'STORE', 'Store'
        OTHER = 'OTHER', 'Other'

    room_number = models.CharField(max_length=20)
    room_name = models.CharField(max_length=100)
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name='rooms')
    room_type = models.CharField(max_length=20, choices=RoomType.choices)
    floor = models.CharField(max_length=50)
    capacity = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    is_available = models.BooleanField(default=True)

    class Meta:
        ordering = ['department', 'room_number']
        unique_together = [('room_number', 'department')]

    def __str__(self):
        return f"{self.room_number} — {self.room_name}"


class DoctorRoomAssignment(models.Model):
    class Shift(models.TextChoices):
        MORNING = 'MORNING', 'Morning'
        AFTERNOON = 'AFTERNOON', 'Afternoon'
        NIGHT = 'NIGHT', 'Night'
        FULL_DAY = 'FULL_DAY', 'Full Day'

    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='room_assignments',
        limit_choices_to={'role': 'DOCTOR'},
    )
    room = models.ForeignKey(Room, on_delete=models.PROTECT, related_name='assignments')
    assigned_date = models.DateField()
    shift = models.CharField(max_length=20, choices=Shift.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='made_assignments',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-assigned_date', '-created_at']

    def __str__(self):
        return f"{self.doctor} → {self.room} ({self.assigned_date})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_active:
            self.room.is_available = False
            self.room.save(update_fields=['is_available'])
        else:
            has_active = (
                DoctorRoomAssignment.objects
                .filter(room=self.room, is_active=True)
                .exclude(pk=self.pk)
                .exists()
            )
            if not has_active:
                self.room.is_available = True
                self.room.save(update_fields=['is_available'])
