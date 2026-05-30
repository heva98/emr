from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ConsultationViewSet, QueueView, ReferralViewSet, TriageViewSet

router = DefaultRouter()
router.register('triage', TriageViewSet, basename='triage')
router.register('consultations', ConsultationViewSet, basename='consultation')
router.register('referrals', ReferralViewSet, basename='referral')

app_name = 'opd'

urlpatterns = [
    path('', include(router.urls)),
    path('queue/', QueueView.as_view(), name='queue'),
]
