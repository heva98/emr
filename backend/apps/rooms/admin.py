from django.contrib import admin

from .models import Department, DoctorRoomAssignment, Room


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    search_fields = ['name']


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['room_number', 'room_name', 'department', 'room_type', 'floor', 'is_active', 'is_available']
    list_filter = ['department', 'room_type', 'floor', 'is_active', 'is_available']
    search_fields = ['room_number', 'room_name']


@admin.register(DoctorRoomAssignment)
class DoctorRoomAssignmentAdmin(admin.ModelAdmin):
    list_display = ['doctor', 'room', 'assigned_date', 'shift', 'is_active', 'assigned_by']
    list_filter = ['shift', 'is_active', 'assigned_date']
    search_fields = ['doctor__first_name', 'doctor__last_name', 'room__room_number']
    raw_id_fields = ['doctor', 'room', 'assigned_by']
