from rest_framework.permissions import BasePermission


class _RolePermission(BasePermission):
    allowed_roles = set()

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in self.allowed_roles
        )


class DashboardPermission(_RolePermission):
    allowed_roles = {"ADMIN", "DOCTOR", "CASHIER"}


class RevenuePermission(_RolePermission):
    allowed_roles = {"ADMIN", "CASHIER"}


class PatientsPermission(_RolePermission):
    allowed_roles = {"ADMIN", "DOCTOR"}


class OpdPermission(_RolePermission):
    allowed_roles = {"ADMIN", "DOCTOR"}


class LabPermission(_RolePermission):
    allowed_roles = {"ADMIN", "LAB_TECH", "DOCTOR"}


class PharmacyPermission(_RolePermission):
    allowed_roles = {"ADMIN", "PHARMACIST", "DOCTOR"}


class CashierPermission(_RolePermission):
    allowed_roles = {"ADMIN", "CASHIER"}
