from datetime import date

from rest_framework import serializers

from .models import Patient, PatientVisit


class PatientVisitSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    patient_id = serializers.CharField(source='patient.patient_id', read_only=True)

    class Meta:
        model = PatientVisit
        fields = [
            'id', 'visit_number', 'patient', 'patient_id', 'visit_date',
            'visit_type', 'status', 'triage_level',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'visit_number', 'patient', 'patient_id',
            'created_by', 'created_at', 'updated_at',
        ]

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() or obj.created_by.username


class PatientVisitWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientVisit
        fields = ['visit_date', 'visit_type', 'status', 'triage_level']


def _compute_age(dob):
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


class PatientListSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            'id', 'patient_id', 'full_name', 'first_name', 'middle_name', 'last_name',
            'date_of_birth', 'age', 'gender', 'phone_primary', 'blood_group',
            'is_active', 'created_at',
        ]

    def get_full_name(self, obj):
        return ' '.join(filter(None, [obj.first_name, obj.middle_name, obj.last_name]))

    def get_age(self, obj):
        return _compute_age(obj.date_of_birth)


class PatientDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    registered_by_name = serializers.SerializerMethodField()
    visits_count = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            'id', 'patient_id', 'full_name',
            'first_name', 'middle_name', 'last_name',
            'date_of_birth', 'age', 'gender', 'national_id',
            'phone_primary', 'phone_secondary', 'email',
            'address_street', 'address_city', 'address_district', 'address_region',
            'next_of_kin_name', 'next_of_kin_phone', 'next_of_kin_relationship',
            'blood_group', 'allergies', 'chronic_conditions', 'photo',
            'is_active', 'registered_by', 'registered_by_name',
            'visits_count', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_full_name(self, obj):
        return ' '.join(filter(None, [obj.first_name, obj.middle_name, obj.last_name]))

    def get_age(self, obj):
        return _compute_age(obj.date_of_birth)

    def get_registered_by_name(self, obj):
        if obj.registered_by:
            return obj.registered_by.get_full_name() or obj.registered_by.username
        return None

    def get_visits_count(self, obj):
        return obj.visits.count()


class PatientWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        exclude = ['patient_id', 'registered_by', 'created_at', 'updated_at']

    def validate_national_id(self, value):
        # Treat empty string as null so unique constraint stays clean
        return value or None

    def validate_date_of_birth(self, value):
        if value > date.today():
            raise serializers.ValidationError("Date of birth cannot be in the future.")
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['registered_by'] = request.user
        return super().create(validated_data)
