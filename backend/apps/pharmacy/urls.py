from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    DispensingQueueView,
    DrugViewSet,
    PrescriptionViewSet,
    StockItemViewSet,
)

router = DefaultRouter()
router.register('drugs', DrugViewSet, basename='drug')
router.register('stock', StockItemViewSet, basename='stock')

app_name = 'pharmacy'

urlpatterns = [
    path('', include(router.urls)),
    path(
        'prescriptions/',
        PrescriptionViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='prescription-list',
    ),
    path(
        'prescriptions/<int:pk>/',
        PrescriptionViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update'}),
        name='prescription-detail',
    ),
    path(
        'prescriptions/<int:pk>/dispense/',
        PrescriptionViewSet.as_view({'post': 'dispense'}),
        name='prescription-dispense',
    ),
    path('dispensing-queue/', DispensingQueueView.as_view(), name='dispensing-queue'),
]
