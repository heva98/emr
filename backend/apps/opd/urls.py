from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ConsultationViewSet,
    ICD10SearchView,
    OPDStatsView,
    QueueView,
    ReferralViewSet,
    TriageViewSet,
    VisitContextView,
)

router = DefaultRouter()
router.register('triage', TriageViewSet, basename='triage')
router.register('consultations', ConsultationViewSet, basename='consultation')
router.register('referrals', ReferralViewSet, basename='referral')

app_name = 'opd'

urlpatterns = [
    path('', include(router.urls)),
    path('queue/', QueueView.as_view(), name='queue'),
    path('stats/', OPDStatsView.as_view(), name='stats'),
    path('visit-context/<int:visit_id>/', VisitContextView.as_view(), name='visit-context'),
    path('icd10/', ICD10SearchView.as_view(), name='icd10-search'),
]
