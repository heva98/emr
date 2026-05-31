from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CashierQueueView,
    DailySummaryView,
    InvoiceViewSet,
    ServiceCatalogViewSet,
)

app_name = 'cashier'

router = DefaultRouter()
router.register('invoices', InvoiceViewSet, basename='invoice')
router.register('service-catalog', ServiceCatalogViewSet, basename='service-catalog')

# Manual routing for the nested invoice actions
_invoice_add_item = InvoiceViewSet.as_view({'post': 'add_item'})
_invoice_remove_item = InvoiceViewSet.as_view({'delete': 'remove_item'})
_invoice_pay = InvoiceViewSet.as_view({'post': 'pay'})
_invoice_receipt = InvoiceViewSet.as_view({'get': 'receipt'})

urlpatterns = [
    path('queue/', CashierQueueView.as_view(), name='cashier-queue'),
    path('daily-summary/', DailySummaryView.as_view(), name='daily-summary'),
    path(
        'invoices/<int:pk>/add-item/',
        _invoice_add_item,
        name='invoice-add-item',
    ),
    path(
        'invoices/<int:pk>/items/<int:iid>/',
        _invoice_remove_item,
        name='invoice-remove-item',
    ),
    path(
        'invoices/<int:pk>/pay/',
        _invoice_pay,
        name='invoice-pay',
    ),
    path(
        'invoices/<int:pk>/receipt/',
        _invoice_receipt,
        name='invoice-receipt',
    ),
    path('', include(router.urls)),
]
