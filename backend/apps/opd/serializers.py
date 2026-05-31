from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.patients.models import Patient, PatientVisit
from .models import Consultation, Referral, Triage

User = get_user_model()


class TriageSerializer(serializers.ModelSerializer):
    recorded_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Triage
        fields = [
            'id', 'visit', 'recorded_by', 'recorded_at',
            'weight_kg', 'height_cm', 'bmi',
            'temperature_celsius',
            'blood_pressure_systolic', 'blood_pressure_diastolic',
            'pulse_rate', 'respiratory_rate', 'oxygen_saturation',
        ]
        read_only_fields = ['bmi', 'recorded_at', 'recorded_by']

    def create(self, validated_data):
        validated_data['recorded_by'] = self.context['request'].user
        return super().create(validated_data)


class ConsultationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Consultation
        fields = [
            'id', 'visit', 'doctor', 'room',
            'started_at', 'ended_at',
            'history_of_presenting_illness', 'review_of_systems',
            'examination_findings', 'diagnosis_primary', 'diagnosis_secondary',
            'icd10_codes', 'clinical_notes', 'plan', 'follow_up_date', 'status',
        ]
        read_only_fields = ['started_at']

    def validate_doctor(self, value):
        if value.role != User.Role.DOCTOR:
            raise serializers.ValidationError("Assigned user must have the DOCTOR role.")
        return value


class ReferralSerializer(serializers.ModelSerializer):
    class Meta:
        model = Referral
        fields = ['id', 'consultation', 'referred_to', 'notes', 'created_at', 'status']
        read_only_fields = ['created_at', 'status']


# ── Queue serializers ──────────────────────────────────────────────────────────

class QueuePatientSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = ['patient_id', 'name']

    def get_name(self, obj):
        return ' '.join(p for p in [obj.first_name, obj.middle_name, obj.last_name] if p)


class QueueTriageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Triage
        fields = ['id', 'recorded_at', 'weight_kg', 'temperature_celsius']


class QueueVisitSerializer(serializers.ModelSerializer):
    patient = QueuePatientSerializer(read_only=True)
    triage = serializers.SerializerMethodField()
    doctor_info = serializers.SerializerMethodField()

    class Meta:
        model = PatientVisit
        fields = [
            'id', 'visit_number', 'patient', 'visit_type',
            'status', 'triage_level', 'created_at', 'triage', 'doctor_info',
        ]

    def get_triage(self, obj):
        try:
            return QueueTriageSerializer(obj.triage).data
        except Triage.DoesNotExist:
            return None

    def get_doctor_info(self, obj):
        try:
            c = obj.consultation
            if c and c.doctor_id:
                return {
                    'id': c.doctor_id,
                    'name': c.doctor.get_full_name() or c.doctor.username,
                }
        except Exception:
            pass
        return None
