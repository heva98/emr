from django.contrib import admin

from .models import Invoice, InvoiceItem, Payment, ServiceCatalog


@admin.register(ServiceCatalog)
class ServiceCatalogAdmin(admin.ModelAdmin):
    list_display = ['name', 'service_type', 'unit_price', 'is_active']
    list_filter = ['service_type', 'is_active']
    search_fields = ['name']


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0
    readonly_fields = ['subtotal']


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    readonly_fields = ['received_at', 'received_by']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = [
        'invoice_number', 'patient', 'total_amount', 'balance_due', 'status', 'created_at',
    ]
    list_filter = ['status', 'created_at']
    search_fields = ['invoice_number', 'patient__first_name', 'patient__last_name']
    readonly_fields = ['invoice_number', 'created_at', 'subtotal', 'total_amount', 'amount_paid', 'balance_due']
    inlines = [InvoiceItemInline, PaymentInline]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'amount', 'payment_method', 'received_by', 'received_at']
    list_filter = ['payment_method', 'received_at']
    readonly_fields = ['received_at']
