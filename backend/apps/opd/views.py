from datetime import date

from django.db.models import F
from rest_framework import generics, mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.patients.models import PatientVisit
from .models import Consultation, Referral, Triage
from .serializers import (
    ConsultationSerializer,
    QueueVisitSerializer,
    ReferralSerializer,
    TriageSerializer,
)


class TriageViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Triage.objects.select_related('visit__patient', 'recorded_by')
    serializer_class = TriageSerializer
    http_method_names = ['get', 'post', 'patch', 'head', 'options']


class ConsultationViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Consultation.objects.select_related('visit__patient', 'doctor', 'room')
    serializer_class = ConsultationSerializer
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    @action(detail=True, methods=['get'], url_path='referrals')
    def referrals(self, request, pk=None):
        consultation = self.get_object()
        qs = consultation.referrals.all()
        serializer = ReferralSerializer(qs, many=True)
        return Response(serializer.data)


class ReferralViewSet(
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Referral.objects.select_related('consultation__visit')
    serializer_class = ReferralSerializer


class QueueView(generics.ListAPIView):
    serializer_class = QueueVisitSerializer

    def get_queryset(self):
        return (
            PatientVisit.objects.filter(
                visit_date=date.today(),
                status__in=[
                    PatientVisit.Status.WAITING,
                    PatientVisit.Status.TRIAGE_DONE,
                ],
            )
            .select_related('patient', 'triage')
            .order_by(F('triage_level').asc(nulls_last=True), 'created_at')
        )
