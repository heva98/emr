from datetime import timedelta

from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    Dispensing,
    Drug,
    Prescription,
    PrescriptionItem,
    StockItem,
    StockMovement,
)
from .serializers import (
    DispenseInputSerializer,
    DispensingQueueSerializer,
    DispensingSerializer,
    DrugSerializer,
    PrescriptionSerializer,
    PrescriptionWriteSerializer,
    StockItemSerializer,
    StockItemWriteSerializer,
    StockTransferSerializer,
)


class DrugViewSet(viewsets.ModelViewSet):
    queryset = Drug.objects.all()
    serializer_class = DrugSerializer
    filterset_fields = [
        'formulation', 'category', 'requires_prescription',
        'is_controlled_substance', 'is_active',
    ]
    search_fields = ['drug_code', 'name', 'brand_name']
    ordering_fields = ['name', 'category', 'drug_code']
    ordering = ['category', 'name']
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']


class StockItemViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        qs = StockItem.objects.select_related('drug', 'received_by')
        p = self.request.query_params
        if drug := p.get('drug'):
            qs = qs.filter(drug_id=drug)
        if location := p.get('location'):
            qs = qs.filter(location=location)
        if search := p.get('search'):
            qs = qs.filter(drug__name__icontains=search) | qs.filter(
                drug__drug_code__icontains=search
            )
        return qs

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return StockItemWriteSerializer
        return StockItemSerializer

    @action(detail=False, methods=['get'], url_path='low-stock')
    def low_stock(self, request):
        items = (
            StockItem.objects.select_related('drug', 'received_by')
            .filter(quantity_in_stock__lte=F('drug__reorder_level'))
            .order_by('drug__name')
        )
        return Response(StockItemSerializer(items, many=True).data)

    @action(detail=False, methods=['get'], url_path='expiring')
    def expiring(self, request):
        try:
            days = int(request.query_params.get('days', 30))
        except (ValueError, TypeError):
            return Response(
                {'detail': 'days must be a positive integer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cutoff = timezone.now().date() + timedelta(days=days)
        items = (
            StockItem.objects.select_related('drug', 'received_by')
            .filter(expiry_date__lte=cutoff, quantity_in_stock__gt=0)
            .order_by('expiry_date')
        )
        return Response(StockItemSerializer(items, many=True).data)

    @action(detail=False, methods=['post'], url_path='transfer')
    @transaction.atomic
    def transfer(self, request):
        ser = StockTransferSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        source = get_object_or_404(
            StockItem.objects.select_for_update().select_related('drug'),
            pk=ser.validated_data['stock_item_id'],
            location=StockItem.Location.MAIN_STORE,
        )
        qty = ser.validated_data['quantity']

        if source.quantity_in_stock < qty:
            return Response(
                {'detail': f'Insufficient stock. Available: {source.quantity_in_stock}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dest, _ = StockItem.objects.get_or_create(
            drug=source.drug,
            batch_number=source.batch_number,
            location=StockItem.Location.DISPENSING,
            defaults={
                'expiry_date': source.expiry_date,
                'unit_cost': source.unit_cost,
                'selling_price': source.selling_price,
                'supplier': source.supplier,
                'quantity_in_stock': 0,
                'received_by': request.user,
            },
        )

        StockMovement.objects.create(
            stock_item=source,
            movement_type=StockMovement.MovementType.TRANSFER_TO_DISPENSING,
            quantity=-qty,
            moved_by=request.user,
        )
        StockMovement.objects.create(
            stock_item=dest,
            movement_type=StockMovement.MovementType.TRANSFER_TO_DISPENSING,
            quantity=qty,
            moved_by=request.user,
        )

        source.refresh_from_db()
        dest.refresh_from_db()
        return Response(
            {
                'source': StockItemSerializer(source).data,
                'destination': StockItemSerializer(dest).data,
            }
        )


class PrescriptionViewSet(viewsets.GenericViewSet):
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = (
            Prescription.objects.select_related('patient', 'visit', 'prescribed_by')
            .prefetch_related('items__drug')
        )
        p = self.request.query_params
        if patient := p.get('patient'):
            qs = qs.filter(patient_id=patient)
        if visit := p.get('visit'):
            qs = qs.filter(visit_id=visit)
        if rx_status := p.get('status'):
            qs = qs.filter(status=rx_status)
        if date_from := p.get('date_from'):
            qs = qs.filter(prescribed_at__date__gte=date_from)
        if date_to := p.get('date_to'):
            qs = qs.filter(prescribed_at__date__lte=date_to)
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return PrescriptionWriteSerializer
        return PrescriptionSerializer

    def list(self, request):
        serializer = PrescriptionSerializer(
            self.get_queryset(), many=True, context={'request': request}
        )
        return Response(serializer.data)

    def create(self, request):
        ser = PrescriptionWriteSerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        prescription = ser.save()
        out = Prescription.objects.select_related(
            'patient', 'visit', 'prescribed_by'
        ).prefetch_related('items__drug').get(pk=prescription.pk)
        return Response(
            PrescriptionSerializer(out, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    def retrieve(self, request, pk=None):
        prescription = get_object_or_404(self.get_queryset(), pk=pk)
        return Response(
            PrescriptionSerializer(prescription, context={'request': request}).data
        )

    def partial_update(self, request, pk=None):
        prescription = get_object_or_404(Prescription, pk=pk)
        ser = PrescriptionSerializer(
            prescription, data=request.data, partial=True, context={'request': request}
        )
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)

    @action(detail=True, methods=['post'], url_path='dispense')
    @transaction.atomic
    def dispense(self, request, pk=None):
        prescription = get_object_or_404(
            Prescription.objects.select_for_update(), pk=pk
        )
        if prescription.status == Prescription.Status.CANCELLED:
            return Response(
                {'detail': 'Cannot dispense a cancelled prescription.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if prescription.status == Prescription.Status.DISPENSED:
            return Response(
                {'detail': 'Prescription is already fully dispensed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        input_ser = DispenseInputSerializer(data=request.data, many=True)
        input_ser.is_valid(raise_exception=True)

        if not input_ser.validated_data:
            return Response(
                {'detail': 'At least one dispense entry is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dispensed = []
        for entry in input_ser.validated_data:
            item = get_object_or_404(
                PrescriptionItem.objects.select_for_update(),
                pk=entry['prescription_item_id'],
                prescription=prescription,
            )
            if item.status == PrescriptionItem.Status.CANCELLED:
                return Response(
                    {'detail': f'Item "{item.drug.name}" is cancelled.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if item.status == PrescriptionItem.Status.DISPENSED:
                return Response(
                    {'detail': f'Item "{item.drug.name}" is already fully dispensed.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            stock = get_object_or_404(
                StockItem.objects.select_for_update(),
                pk=entry['stock_item_id'],
            )
            qty = entry['quantity_dispensed']

            if stock.quantity_in_stock < qty:
                return Response(
                    {
                        'detail': (
                            f'Insufficient stock for "{item.drug.name}". '
                            f'Available: {stock.quantity_in_stock}.'
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            remaining = item.quantity_prescribed - item.quantity_dispensed
            if qty > remaining:
                return Response(
                    {
                        'detail': (
                            f'Quantity {qty} exceeds remaining prescribed amount '
                            f'{remaining} for "{item.drug.name}".'
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            dispensing = Dispensing.objects.create(
                prescription_item=item,
                stock_item=stock,
                quantity_dispensed=qty,
                dispensed_by=request.user,
            )
            dispensed.append(dispensing)

        return Response(
            DispensingSerializer(dispensed, many=True).data,
            status=status.HTTP_201_CREATED,
        )


class DispensingQueueView(generics.ListAPIView):
    serializer_class = DispensingQueueSerializer

    def get_queryset(self):
        today = timezone.now().date()
        return (
            Prescription.objects.filter(
                status__in=[
                    Prescription.Status.PENDING,
                    Prescription.Status.PARTIALLY_DISPENSED,
                ],
                prescribed_at__date=today,
            )
            .select_related('patient', 'visit', 'prescribed_by')
            .prefetch_related('items__drug')
            .order_by('prescribed_at')
        )
