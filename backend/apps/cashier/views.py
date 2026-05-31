from django.db.models import Q, Sum
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import mixins, status, viewsets
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


class ServiceCatalogViewSet(viewsets.ModelViewSet):
    queryset = ServiceCatalog.objects.all()
    serializer_class = ServiceCatalogSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']
    filterset_fields = ['service_type', 'is_active']


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
        qs = Invoice.objects.select_related(
            'patient', 'visit', 'created_by'
        ).prefetch_related('items__service_catalog', 'payments__received_by')

        date_str = self.request.query_params.get('date')
        if date_str:
            d = parse_date(date_str)
            if d:
                qs = qs.filter(created_at__date=d)
        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return InvoiceCreateSerializer
        return InvoiceSerializer

    def add_item(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status == Invoice.Status.CANCELLED:
            return Response(
                {'detail': 'Cannot add items to a cancelled invoice.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = InvoiceItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save(invoice=invoice)
        _recalculate_invoice(invoice)
        return Response(InvoiceItemSerializer(item).data, status=status.HTTP_201_CREATED)

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
        _recalculate_invoice(invoice)
        return Response(status=status.HTTP_204_NO_CONTENT)

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
                'invoice': InvoiceSerializer(invoice).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def receipt(self, request, pk=None):
        invoice = self.get_object()
        return Response(InvoiceSerializer(invoice).data)


def _recalculate_invoice(invoice):
    subtotal = sum(i.subtotal for i in invoice.items.all())
    invoice.subtotal = subtotal
    invoice.total_amount = max(0, subtotal - invoice.discount_amount)
    invoice.balance_due = max(0, invoice.total_amount - invoice.amount_paid)
    invoice.save()


class CashierQueueView(APIView):
    def get(self, request):
        invoices = (
            Invoice.objects
            .filter(status__in=[Invoice.Status.DRAFT, Invoice.Status.ISSUED])
            .select_related('patient', 'visit', 'created_by')
            .prefetch_related('items')
        )
        return Response(InvoiceSerializer(invoices, many=True).data)


class DailySummaryView(APIView):
    def get(self, request):
        date_str = request.query_params.get('date')
        if date_str:
            date = parse_date(date_str)
            if not date:
                return Response(
                    {'detail': 'Invalid date. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            date = timezone.now().date()

        invoices = Invoice.objects.filter(created_at__date=date)
        payments = Payment.objects.filter(received_at__date=date)

        cash_total = (
            payments.filter(payment_method=Payment.PaymentMethod.CASH)
            .aggregate(total=Sum('amount'))['total'] or 0
        )
        mobile_total = (
            payments.filter(payment_method=Payment.PaymentMethod.MOBILE_MONEY)
            .aggregate(total=Sum('amount'))['total'] or 0
        )

        return Response({
            'date': date.isoformat(),
            'total_invoices': invoices.count(),
            'paid_count': invoices.filter(status=Invoice.Status.PAID).count(),
            'total_cash': cash_total,
            'total_mobile_money': mobile_total,
        })
