from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CashierQueueView, DailySummaryView, InvoiceViewSet, ServiceCatalogViewSet

app_name = 'cashier'

router = DefaultRouter()
router.register('invoices', InvoiceViewSet, basename='invoice')
router.register('service-catalog', ServiceCatalogViewSet, basename='service-catalog')

urlpatterns = [
    path('queue/', CashierQueueView.as_view(), name='cashier-queue'),
    path('daily-summary/', DailySummaryView.as_view(), name='daily-summary'),
    path('', include(router.urls)),
]
