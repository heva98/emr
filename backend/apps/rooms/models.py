from django.db import models


class Room(models.Model):
    class RoomType(models.TextChoices):
        CONSULTATION = 'CONSULTATION', 'Consultation'
        PROCEDURE = 'PROCEDURE', 'Procedure'
        OBSERVATION = 'OBSERVATION', 'Observation'

    name = models.CharField(max_length=100)
    room_type = models.CharField(
        max_length=20, choices=RoomType.choices, default=RoomType.CONSULTATION
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name
