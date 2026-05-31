from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Case, IntegerField, Value, When
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.patients.models import Patient, PatientVisit

from .models import LabOrder, LabOrderItem, LabResult, LabTestCatalog
from .serializers import (
    CollectSpecimenSerializer,
    LabHistoryOrderSerializer,
    LabOrderSerializer,
    LabOrderWriteSerializer,
    LabQueueOrderSerializer,
    LabResultInputSerializer,
    LabResultSerializer,
    LabTestCatalogSerializer,
)

User = get_user_model()

_PRIORITY_RANK = Case(
    When(priority=LabOrder.Priority.STAT, then=Value(0)),
    When(priority=LabOrder.Priority.URGENT, then=Value(1)),
    When(priority=LabOrder.Priority.ROUTINE, then=Value(2)),
    default=Value(3),
    output_field=IntegerField(),
)

_PENDING_STATUSES = [
    LabOrder.Status.ORDERED,
    LabOrder.Status.SPECIMEN_COLLECTED,
    LabOrder.Status.PROCESSING,
    LabOrder.Status.RESULTED,
]


class LabTestCatalogViewSet(viewsets.ModelViewSet):
    queryset = LabTestCatalog.objects.all()
    serializer_class = LabTestCatalogSerializer
    filterset_fields = ['category', 'specimen_type', 'is_active']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'category', 'price']
    ordering = ['category', 'name']
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']


class LabOrderViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = LabOrder.objects.select_related(
            'patient', 'visit', 'ordered_by'
        ).prefetch_related('items__test', 'items__result')

        p = self.request.query_params
        if patient := p.get('patient'):
            qs = qs.filter(patient_id=patient)
        if visit := p.get('visit'):
            qs = qs.filter(visit_id=visit)
        if order_status := p.get('status'):
            qs = qs.filter(status=order_status)
        if priority := p.get('priority'):
            qs = qs.filter(priority=priority)
        if date_from := p.get('date_from'):
            qs = qs.filter(ordered_at__date__gte=date_from)
        if date_to := p.get('date_to'):
            qs = qs.filter(ordered_at__date__lte=date_to)
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return LabOrderWriteSerializer
        return LabOrderSerializer

    def create(self, request, *args, **kwargs):
        write_ser = LabOrderWriteSerializer(data=request.data, context={'request': request})
        write_ser.is_valid(raise_exception=True)
        order = write_ser.save()
        order = (
            LabOrder.objects.select_related('patient', 'visit', 'ordered_by')
            .prefetch_related('items__test', 'items__result')
            .get(pk=order.pk)
        )
        return Response(LabOrderSerializer(order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='collect-specimen')
    def collect_specimen(self, request, pk=None):
        order = get_object_or_404(LabOrder, pk=pk)
        ser = CollectSpecimenSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        collector = get_object_or_404(User, pk=data['collected_by'])

        with transaction.atomic():
            items = order.items.filter(id__in=data['item_ids'])
            if not items.exists():
                return Response(
                    {'detail': 'No matching items found.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            items.update(
                status=LabOrderItem.Status.SPECIMEN_COLLECTED,
                specimen_collected_at=data['collected_at'],
                collected_by=collector,
            )
            order.status = LabOrder.Status.SPECIMEN_COLLECTED
            order.save()

        order = LabOrder.objects.prefetch_related(
            'items__test', 'items__result'
        ).select_related('patient', 'visit', 'ordered_by').get(pk=order.pk)
        return Response(LabOrderSerializer(order).data)

    @action(detail=True, methods=['post'], url_path='results')
    def results(self, request, pk=None):
        order = get_object_or_404(LabOrder, pk=pk)
        input_ser = LabResultInputSerializer(data=request.data, many=True)
        input_ser.is_valid(raise_exception=True)

        created_results = []
        with transaction.atomic():
            for entry in input_ser.validated_data:
                item = get_object_or_404(LabOrderItem, pk=entry['order_item_id'], order=order)
                result, _ = LabResult.objects.update_or_create(
                    order_item=item,
                    defaults={
                        'result_value': entry['result_value'],
                        'normal_low': entry['normal_low'],
                        'normal_high': entry['normal_high'],
                        'flag': entry['flag'],
                        'notes': entry['notes'],
                        'resulted_by': request.user,
                    },
                )
                item.status = LabOrderItem.Status.RESULTED
                item.save()
                created_results.append(result)

            order.status = LabOrder.Status.RESULTED
            order.save()

        results_qs = LabResult.objects.select_related(
            'resulted_by', 'verified_by'
        ).filter(pk__in=[r.pk for r in created_results])
        return Response(
            LabResultSerializer(results_qs, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['patch'], url_path='verify')
    def verify(self, request, pk=None):
        order = get_object_or_404(
            LabOrder.objects.prefetch_related('items'), pk=pk
        )
        if order.status != LabOrder.Status.RESULTED:
            return Response(
                {'detail': 'Order must be in RESULTED status before verification.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        with transaction.atomic():
            for item in order.items.all():
                try:
                    result = item.result
                    result.verified_by = request.user
                    result.verified_at = now
                    result.save()
                    item.status = LabOrderItem.Status.VERIFIED
                    item.save()
                except LabResult.DoesNotExist:
                    pass

            order.status = LabOrder.Status.VERIFIED
            order.save()

            visit = order.visit
            has_pending = LabOrder.objects.filter(
                visit=visit, status__in=_PENDING_STATUSES
            ).exists()
            if not has_pending and visit.status == PatientVisit.Status.LAB_PENDING:
                visit.status = PatientVisit.Status.WITH_DOCTOR
                visit.save()

        order = LabOrder.objects.prefetch_related(
            'items__test', 'items__result__resulted_by', 'items__result__verified_by'
        ).select_related('patient', 'visit', 'ordered_by').get(pk=order.pk)
        return Response(LabOrderSerializer(order).data)


class LabQueueView(generics.ListAPIView):
    serializer_class = LabQueueOrderSerializer

    def get_queryset(self):
        return (
            LabOrder.objects.filter(
                status__in=[LabOrder.Status.ORDERED, LabOrder.Status.SPECIMEN_COLLECTED]
            )
            .select_related('patient', 'visit', 'ordered_by')
            .prefetch_related('items__test')
            .annotate(priority_rank=_PRIORITY_RANK)
            .order_by('priority_rank', 'ordered_at')
        )


class PatientLabHistoryView(generics.ListAPIView):
    serializer_class = LabHistoryOrderSerializer

    def get_queryset(self):
        patient = get_object_or_404(Patient, pk=self.kwargs['patient_id'])
        return (
            LabOrder.objects.filter(patient=patient, status=LabOrder.Status.VERIFIED)
            .select_related('ordered_by')
            .prefetch_related(
                'items__test',
                'items__result__resulted_by',
                'items__result__verified_by',
            )
            .order_by('-ordered_at')
        )
