from django.db.models import Sum
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Invoice, InvoiceItem, Payment, ServiceCatalog
from .serializers import (
    InvoiceCreateSerializer,
    InvoiceItemSerializer,
    InvoiceSerializer,
    PaymentCreateSerializer,
    PaymentSerializer,
    ServiceCatalogSerializer,
)


def _sync_totals(invoice):
    """Sum item subtotals → set invoice.subtotal → save() derives total_amount/balance_due."""
    invoice.subtotal = sum(i.subtotal for i in invoice.items.all())
    invoice.save()
    invoice.refresh_from_db()


class ServiceCatalogViewSet(viewsets.ModelViewSet):
    queryset = ServiceCatalog.objects.all()
    serializer_class = ServiceCatalogSerializer
    filterset_fields = ['service_type', 'is_active']
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']


class InvoiceViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    http_method_names = ['get', 'post', 'patch', 'head', 'options']
    filterset_fields = ['status', 'patient']

    def get_queryset(self):
        qs = (
            Invoice.objects
            .select_related('patient', 'visit', 'created_by')
            .prefetch_related('items__service_catalog', 'payments__received_by')
        )
        date_str = self.request.query_params.get('date')
        if date_str:
            d = parse_date(date_str)
            if d:
                qs = qs.filter(created_at__date=d)
        return qs.order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return InvoiceCreateSerializer
        return InvoiceSerializer

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        instance.refresh_from_db()
        return Response(InvoiceSerializer(instance, context={'request': request}).data)

    # ── POST /invoices/{id}/add-item/ ─────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='add-item')
    def add_item(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status == Invoice.Status.CANCELLED:
            return Response(
                {'detail': 'Cannot add items to a cancelled invoice.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = InvoiceItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(invoice=invoice)
        _sync_totals(invoice)
        return Response(
            InvoiceSerializer(invoice, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    # ── DELETE /invoices/{id}/items/{iid}/ ────────────────────────────────────
    @action(detail=True, methods=['delete'], url_path=r'items/(?P<iid>[^/.]+)')
    def remove_item(self, request, pk=None, iid=None):
        invoice = self.get_object()
        if invoice.status != Invoice.Status.DRAFT:
            return Response(
                {'detail': 'Items can only be removed from DRAFT invoices.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            item = invoice.items.get(pk=iid)
        except InvoiceItem.DoesNotExist:
            return Response({'detail': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)
        item.delete()
        _sync_totals(invoice)
        return Response(
            InvoiceSerializer(invoice, context={'request': request}).data,
        )

    # ── POST /invoices/{id}/pay/ ──────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='pay')
    def pay(self, request, pk=None):
        invoice = self.get_object()
        serializer = PaymentCreateSerializer(
            data=request.data,
            context={'request': request, 'invoice': invoice},
        )
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        invoice.refresh_from_db()
        return Response(
            {
                'payment': PaymentSerializer(payment).data,
                'invoice': InvoiceSerializer(invoice, context={'request': request}).data,
            },
            status=status.HTTP_201_CREATED,
        )

    # ── GET /invoices/{id}/receipt/ ───────────────────────────────────────────
    @action(detail=True, methods=['get'], url_path='receipt')
    def receipt(self, request, pk=None):
        invoice = self.get_object()
        return Response(InvoiceSerializer(invoice, context={'request': request}).data)


# ── GET /cashier/queue/ ───────────────────────────────────────────────────────

class CashierQueueView(APIView):
    def get(self, request):
        invoices = (
            Invoice.objects
            .filter(status__in=[Invoice.Status.DRAFT, Invoice.Status.ISSUED])
            .select_related('patient', 'visit', 'created_by')
            .prefetch_related('items__service_catalog', 'payments__received_by')
            .order_by('created_at')
        )
        return Response(InvoiceSerializer(invoices, many=True).data)


# ── GET /cashier/daily-summary/?date=YYYY-MM-DD ───────────────────────────────

class DailySummaryView(APIView):
    def get(self, request):
        date_str = request.query_params.get('date')
        if date_str:
            target_date = parse_date(date_str)
            if not target_date:
                return Response(
                    {'detail': 'Invalid date. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            target_date = timezone.now().date()

        invoices = Invoice.objects.filter(created_at__date=target_date)
        payments = Payment.objects.filter(received_at__date=target_date)

        total_cash = (
            payments.filter(payment_method=Payment.PaymentMethod.CASH)
            .aggregate(t=Sum('amount'))['t'] or 0
        )
        total_mobile = (
            payments.filter(payment_method=Payment.PaymentMethod.MOBILE_MONEY)
            .aggregate(t=Sum('amount'))['t'] or 0
        )

        return Response({
            'date': target_date.isoformat(),
            'total_invoices': invoices.count(),
            'paid_count': invoices.filter(status=Invoice.Status.PAID).count(),
            'total_cash': total_cash,
            'total_mobile_money': total_mobile,
            'total_collected': total_cash + total_mobile,
        })
