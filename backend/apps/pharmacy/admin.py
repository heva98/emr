from django.contrib import admin

from .models import (
    Dispensing,
    Drug,
    Prescription,
    PrescriptionItem,
    StockItem,
    StockMovement,
)


@admin.register(Drug)
class DrugAdmin(admin.ModelAdmin):
    list_display = (
        'drug_code', 'name', 'brand_name', 'formulation', 'strength',
        'category', 'requires_prescription', 'is_controlled_substance',
        'reorder_level', 'is_active',
    )
    list_filter = ('formulation', 'category', 'requires_prescription', 'is_controlled_substance', 'is_active')
    search_fields = ('drug_code', 'name', 'brand_name')
    ordering = ('category', 'name')


class StockMovementInline(admin.TabularInline):
    model = StockMovement
    extra = 0
    readonly_fields = ('movement_type', 'quantity', 'reference_number', 'moved_by', 'moved_at', 'notes')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(StockItem)
class StockItemAdmin(admin.ModelAdmin):
    list_display = (
        'drug', 'batch_number', 'location', 'expiry_date',
        'quantity_in_stock', 'unit_cost', 'selling_price', 'received_at',
    )
    list_filter = ('location', 'expiry_date', 'drug__category')
    search_fields = ('drug__name', 'drug__drug_code', 'batch_number', 'supplier')
    raw_id_fields = ('drug', 'received_by')
    readonly_fields = ('received_at', 'quantity_in_stock')
    ordering = ('drug__name', 'expiry_date')
    inlines = [StockMovementInline]


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = (
        'stock_item', 'movement_type', 'quantity', 'reference_number',
        'moved_by', 'moved_at',
    )
    list_filter = ('movement_type', 'moved_at')
    search_fields = (
        'stock_item__drug__name', 'stock_item__batch_number', 'reference_number',
    )
    raw_id_fields = ('stock_item', 'moved_by')
    readonly_fields = ('moved_at',)
    ordering = ('-moved_at',)


class PrescriptionItemInline(admin.TabularInline):
    model = PrescriptionItem
    extra = 0
    readonly_fields = ('quantity_dispensed', 'status')
    raw_id_fields = ('drug',)


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = (
        'prescription_number', 'patient', 'visit', 'prescribed_by',
        'prescribed_at', 'status',
    )
    list_filter = ('status', 'prescribed_at')
    search_fields = (
        'prescription_number',
        'patient__patient_id',
        'patient__first_name',
        'patient__last_name',
    )
    raw_id_fields = ('patient', 'visit', 'prescribed_by')
    readonly_fields = ('prescription_number', 'prescribed_at')
    ordering = ('-prescribed_at',)
    inlines = [PrescriptionItemInline]


class DispensingInline(admin.TabularInline):
    model = Dispensing
    extra = 0
    readonly_fields = ('stock_item', 'quantity_dispensed', 'dispensed_by', 'dispensed_at')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(PrescriptionItem)
class PrescriptionItemAdmin(admin.ModelAdmin):
    list_display = (
        'prescription', 'drug', 'dose', 'frequency', 'duration',
        'quantity_prescribed', 'quantity_dispensed', 'status',
    )
    list_filter = ('status',)
    search_fields = (
        'prescription__prescription_number',
        'drug__name',
        'drug__drug_code',
    )
    raw_id_fields = ('prescription', 'drug')
    readonly_fields = ('quantity_dispensed', 'status')
    inlines = [DispensingInline]


@admin.register(Dispensing)
class DispensingAdmin(admin.ModelAdmin):
    list_display = (
        'prescription_item', 'stock_item', 'quantity_dispensed',
        'dispensed_by', 'dispensed_at',
    )
    list_filter = ('dispensed_at',)
    search_fields = (
        'prescription_item__prescription__prescription_number',
        'prescription_item__drug__name',
    )
    raw_id_fields = ('prescription_item', 'stock_item', 'dispensed_by')
    readonly_fields = ('dispensed_at',)
    ordering = ('-dispensed_at',)
