from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Department, DoctorRoomAssignment, Room

User = get_user_model()


class DepartmentSerializer(serializers.ModelSerializer):
    room_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'description', 'room_count']

    def get_room_count(self, obj):
        return obj.rooms.filter(is_active=True).count()


class RoomSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.get_name_display', read_only=True)
    assigned_doctor = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            'id', 'room_number', 'room_name', 'department', 'department_name',
            'room_type', 'floor', 'capacity', 'is_active', 'is_available',
            'assigned_doctor',
        ]

    def get_assigned_doctor(self, obj):
        assignment = (
            obj.assignments.filter(is_active=True)
            .select_related('doctor')
            .first()
        )
        if not assignment:
            return None
        return {
            'id': assignment.doctor.id,
            'name': assignment.doctor.get_full_name() or assignment.doctor.username,
            'shift': assignment.shift,
            'assignment_id': assignment.id,
        }


class DoctorSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'name', 'username']

    def get_name(self, obj):
        return obj.get_full_name() or obj.username


class DoctorRoomAssignmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()
    room_number = serializers.CharField(source='room.room_number', read_only=True)
    room_name = serializers.CharField(source='room.room_name', read_only=True)
    department_name = serializers.CharField(source='room.department.get_name_display', read_only=True)
    assigned_by_name = serializers.SerializerMethodField()

    class Meta:
        model = DoctorRoomAssignment
        fields = [
            'id', 'doctor', 'doctor_name', 'room', 'room_number', 'room_name',
            'department_name', 'assigned_date', 'shift', 'start_time', 'end_time',
            'is_active', 'assigned_by', 'assigned_by_name', 'created_at',
        ]
        read_only_fields = ['assigned_by', 'created_at']

    def get_doctor_name(self, obj):
        return obj.doctor.get_full_name() or obj.doctor.username

    def get_assigned_by_name(self, obj):
        return obj.assigned_by.get_full_name() or obj.assigned_by.username

    def create(self, validated_data):
        validated_data['assigned_by'] = self.context['request'].user
        return super().create(validated_data)
