from django.db.models import Q
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from .filters import PatientFilter
from .models import Patient, PatientVisit
from .serializers import (
    PatientDetailSerializer,
    PatientListSerializer,
    PatientVisitSerializer,
    PatientVisitWriteSerializer,
    PatientWriteSerializer,
)


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.select_related('registered_by').all()
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = PatientFilter
    search_fields = ['first_name', 'last_name', 'patient_id', 'phone_primary']
    ordering_fields = ['created_at', 'last_name', 'first_name', 'patient_id']
    ordering = ['-created_at']
    # No PUT, no DELETE — use PATCH and is_active flag
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_serializer_class(self):
        if self.action in ('create', 'partial_update'):
            return PatientWriteSerializer
        if self.action == 'retrieve':
            return PatientDetailSerializer
        return PatientListSerializer

    @action(detail=False, methods=['get'])
    def search(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response([])
        qs = (
            Patient.objects.filter(
                Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(patient_id__icontains=q)
                | Q(phone_primary__icontains=q)
            )
            .order_by('-created_at')[:10]
        )
        return Response(PatientListSerializer(qs, many=True).data)

    @action(detail=True, methods=['get', 'post'], url_path='visits', url_name='visits')
    def visits(self, request, pk=None):
        patient = self.get_object()
        if request.method == 'POST':
            serializer = PatientVisitWriteSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(patient=patient, created_by=request.user)
            return Response(
                PatientVisitSerializer(serializer.instance).data,
                status=status.HTTP_201_CREATED,
            )
        qs = patient.visits.select_related('created_by').order_by('-visit_date', '-created_at')
        return Response(PatientVisitSerializer(qs, many=True).data)

    @action(
        detail=True,
        methods=['get'],
        url_path=r'visits/(?P<vid>[^/.]+)',
        url_name='visit-detail',
    )
    def visit_detail(self, request, pk=None, vid=None):
        patient = self.get_object()
        visit = get_object_or_404(
            PatientVisit.objects.select_related('created_by'),
            pk=vid,
            patient=patient,
        )
        return Response(PatientVisitSerializer(visit).data)
