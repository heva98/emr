from django.contrib import admin

from .models import LabOrder, LabOrderItem, LabResult, LabTestCatalog


@admin.register(LabTestCatalog)
class LabTestCatalogAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'category', 'specimen_type', 'price', 'turnaround_hours', 'is_active')
    list_filter = ('category', 'specimen_type', 'is_active')
    search_fields = ('code', 'name')
    ordering = ('category', 'name')


class LabOrderItemInline(admin.TabularInline):
    model = LabOrderItem
    extra = 0
    readonly_fields = ('status', 'specimen_collected_at', 'collected_by')
    raw_id_fields = ('test', 'collected_by')


@admin.register(LabOrder)
class LabOrderAdmin(admin.ModelAdmin):
    list_display = (
        'order_number', 'patient', 'visit', 'priority', 'status', 'ordered_by', 'ordered_at'
    )
    list_filter = ('priority', 'status', 'ordered_at')
    search_fields = (
        'order_number',
        'patient__patient_id',
        'patient__first_name',
        'patient__last_name',
    )
    readonly_fields = ('order_number', 'ordered_at')
    raw_id_fields = ('patient', 'visit', 'ordered_by')
    ordering = ('-ordered_at',)
    inlines = [LabOrderItemInline]


@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = (
        'order_item', 'result_value', 'result_numeric', 'flag',
        'resulted_by', 'resulted_at', 'verified_by', 'verified_at',
    )
    list_filter = ('flag', 'resulted_at', 'verified_at')
    search_fields = (
        'order_item__order__order_number',
        'order_item__test__code',
        'order_item__test__name',
    )
    readonly_fields = ('result_numeric', 'resulted_at', 'verified_at')
    raw_id_fields = ('order_item', 'resulted_by', 'verified_by')
    ordering = ('-resulted_at',)
