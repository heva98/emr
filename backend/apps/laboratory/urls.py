from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LabOrderViewSet, LabQueueView, LabTestCatalogViewSet

router = DefaultRouter()
router.register('catalog', LabTestCatalogViewSet, basename='catalog')
router.register('orders', LabOrderViewSet, basename='order')

app_name = 'laboratory'

urlpatterns = [
    path('', include(router.urls)),
    path('queue/', LabQueueView.as_view(), name='queue'),
]
