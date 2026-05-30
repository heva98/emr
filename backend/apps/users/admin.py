from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "first_name", "last_name", "role", "is_active")
    list_filter = ("role", "is_active", "is_staff")
    fieldsets = UserAdmin.fieldsets + (
        ("EMR Profile", {"fields": ("role", "phone", "department")}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ("EMR Profile", {"fields": ("role", "phone", "department")}),
    )
    search_fields = ("username", "first_name", "last_name", "email")
