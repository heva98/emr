from django.contrib import admin

from .models import Patient, PatientVisit


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = (
        'patient_id', 'full_name_display', 'gender', 'date_of_birth',
        'phone_primary', 'blood_group', 'is_active', 'created_at',
    )
    list_filter = ('gender', 'blood_group', 'is_active', 'address_region')
    search_fields = ('patient_id', 'first_name', 'last_name', 'national_id', 'phone_primary')
    readonly_fields = ('patient_id', 'created_at', 'updated_at')
    ordering = ('-created_at',)
    fieldsets = (
        ('Identity', {
            'fields': (
                'patient_id', 'first_name', 'middle_name', 'last_name',
                'date_of_birth', 'gender', 'national_id', 'photo',
            ),
        }),
        ('Contact', {
            'fields': ('phone_primary', 'phone_secondary', 'email'),
        }),
        ('Address', {
            'fields': ('address_street', 'address_city', 'address_district', 'address_region'),
        }),
        ('Next of Kin', {
            'fields': ('next_of_kin_name', 'next_of_kin_phone', 'next_of_kin_relationship'),
        }),
        ('Medical', {
            'fields': ('blood_group', 'allergies', 'chronic_conditions'),
        }),
        ('System', {
            'fields': ('is_active', 'registered_by', 'created_at', 'updated_at'),
        }),
    )

    def full_name_display(self, obj):
        return ' '.join(filter(None, [obj.first_name, obj.middle_name, obj.last_name]))
    full_name_display.short_description = 'Full Name'


@admin.register(PatientVisit)
class PatientVisitAdmin(admin.ModelAdmin):
    list_display = (
        'visit_number', 'patient', 'visit_date', 'visit_type',
        'status', 'triage_level', 'created_by', 'created_at',
    )
    list_filter = ('visit_type', 'status', 'triage_level', 'visit_date')
    search_fields = (
        'visit_number', 'patient__patient_id',
        'patient__first_name', 'patient__last_name',
    )
    readonly_fields = ('visit_number', 'created_at', 'updated_at')
    ordering = ('-visit_date', '-created_at')
    raw_id_fields = ('patient', 'created_by')
