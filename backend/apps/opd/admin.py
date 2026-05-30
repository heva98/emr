from django.contrib import admin

from .models import Consultation, Referral, Triage


@admin.register(Triage)
class TriageAdmin(admin.ModelAdmin):
    list_display = ['visit', 'triage_level', 'recorded_by', 'recorded_at']
    list_filter = ['triage_level']
    readonly_fields = ['bmi', 'recorded_at', 'recorded_by']


@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    list_display = ['visit', 'doctor', 'status', 'started_at']
    list_filter = ['status']
    readonly_fields = ['started_at']


@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ['consultation', 'referred_to', 'status', 'created_at']
    list_filter = ['referred_to', 'status']
    readonly_fields = ['created_at']
