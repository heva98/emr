"""
Management command: check for patients waiting > 60 minutes and notify ADMIN.
Run hourly via a cron job or scheduler.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.patients.models import PatientVisit
from apps.users.models import Notification

User = get_user_model()


class Command(BaseCommand):
    help = "Notify ADMINs about patients waiting more than 60 minutes."

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(minutes=60)
        long_waiting = PatientVisit.objects.filter(
            status=PatientVisit.Status.WAITING,
            created_at__lte=cutoff,
        ).select_related('patient')

        if not long_waiting.exists():
            self.stdout.write("No long-wait patients found.")
            return

        admins = User.objects.filter(role=User.Role.ADMIN, is_active=True)
        if not admins.exists():
            self.stdout.write("No active admins to notify.")
            return

        notifications = []
        for visit in long_waiting:
            p = visit.patient
            waited_mins = int((timezone.now() - visit.created_at).total_seconds() / 60)
            msg = (
                f"Long wait alert: {p.first_name} {p.last_name} ({p.patient_id}) "
                f"has been waiting {waited_mins} minutes — Visit {visit.visit_number}."
            )
            for admin in admins:
                notifications.append(Notification(
                    user=admin,
                    message=msg,
                    notification_type=Notification.NotificationType.LONG_WAIT,
                ))

        Notification.objects.bulk_create(notifications)
        self.stdout.write(
            self.style.SUCCESS(
                f"Created {len(notifications)} long-wait notification(s)."
            )
        )
