from django.core.management.base import BaseCommand
from apps.users.models import CustomUser

DEFAULT_USERS = [
    {
        "username": "admin1",
        "first_name": "Admin",
        "last_name": "User",
        "role": CustomUser.Role.ADMIN,
        "is_staff": True,
        "is_superuser": True,
    },
    {
        "username": "dr_john",
        "first_name": "John",
        "last_name": "Mwangi",
        "role": CustomUser.Role.DOCTOR,
        "department": "General Medicine",
    },
    {
        "username": "dr_amina",
        "first_name": "Amina",
        "last_name": "Juma",
        "role": CustomUser.Role.DOCTOR,
        "department": "Paediatrics",
    },
    {
        "username": "nurse_grace",
        "first_name": "Grace",
        "last_name": "Kimaro",
        "role": CustomUser.Role.NURSE,
        "department": "General Ward",
    },
    {
        "username": "lab_peter",
        "first_name": "Peter",
        "last_name": "Ngowi",
        "role": CustomUser.Role.LAB_TECH,
        "department": "Laboratory",
    },
    {
        "username": "pharm_hassan",
        "first_name": "Hassan",
        "last_name": "Salim",
        "role": CustomUser.Role.PHARMACIST,
        "department": "Pharmacy",
    },
    {
        "username": "cashier_mary",
        "first_name": "Mary",
        "last_name": "Tesha",
        "role": CustomUser.Role.CASHIER,
        "department": "Finance",
    },
    {
        "username": "reception_ali",
        "first_name": "Ali",
        "last_name": "Hassan",
        "role": CustomUser.Role.RECEPTIONIST,
        "department": "Reception",
    },
]

PASSWORD = "Test1234!"


class Command(BaseCommand):
    help = "Create one default user per role for development/testing"

    def handle(self, *args, **options):
        created = 0
        skipped = 0

        for user_data in DEFAULT_USERS:
            username = user_data["username"]
            if CustomUser.objects.filter(username=username).exists():
                self.stdout.write(f"  skip  {username} (already exists)")
                skipped += 1
                continue

            user = CustomUser(**user_data)
            user.set_password(PASSWORD)
            user.save()
            created += 1
            self.stdout.write(
                self.style.SUCCESS(f"  created {username} [{user_data['role']}]")
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone: {created} created, {skipped} skipped. Password: {PASSWORD}"
            )
        )
