from rest_framework import serializers

from .models import Invoice, InvoiceItem, Payment, ServiceCatalog


class ServiceCatalogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCatalog
        fields = ['id', 'name', 'service_type', 'unit_price', 'is_active']


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'description', 'service_catalog', 'quantity',
            'unit_price', 'subtotal', 'reference_type', 'reference_id',
        ]
        read_only_fields = ['subtotal']


class PaymentSerializer(serializers.ModelSerializer):
    received_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            'id', 'amount', 'payment_method', 'mobile_money_reference',
            'received_by', 'received_by_name', 'received_at', 'notes',
        ]
        read_only_fields = ['received_by', 'received_at']

    def get_received_by_name(self, obj):
        u = obj.received_by
        return f"{u.first_name} {u.last_name}".strip() or u.username


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'patient', 'patient_name', 'visit',
            'created_by', 'created_at',
            'subtotal', 'discount_amount', 'total_amount',
            'amount_paid', 'balance_due', 'status', 'notes',
            'items', 'payments',
        ]
        read_only_fields = [
            'invoice_number', 'created_by', 'created_at',
            'subtotal', 'total_amount', 'amount_paid', 'balance_due',
        ]

    def get_patient_name(self, obj):
        p = obj.patient
        return ' '.join(x for x in [p.first_name, p.middle_name or '', p.last_name] if x)


class InvoiceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ['patient', 'visit', 'discount_amount', 'notes']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        invoice = super().create(validated_data)
        from .billing_service import generate_invoice_items
        generate_invoice_items(invoice.visit_id)
        invoice.refresh_from_db()
        return invoice

    def to_representation(self, instance):
        return InvoiceSerializer(instance, context=self.context).data


class PaymentCreateSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=1)
    payment_method = serializers.ChoiceField(choices=Payment.PaymentMethod.choices)
    mobile_money_reference = serializers.CharField(
        max_length=50, required=False, allow_blank=True, default=''
    )
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        invoice = self.context['invoice']
        if invoice.status in [Invoice.Status.PAID, Invoice.Status.CANCELLED]:
            raise serializers.ValidationError(
                f"Cannot pay an invoice with status '{invoice.get_status_display()}'."
            )
        if data['amount'] > invoice.balance_due:
            raise serializers.ValidationError(
                f"Amount ({data['amount']}) exceeds balance due ({invoice.balance_due})."
            )
        if (
            data['payment_method'] == Payment.PaymentMethod.MOBILE_MONEY
            and not data.get('mobile_money_reference')
        ):
            raise serializers.ValidationError(
                "mobile_money_reference is required for Mobile Money payments."
            )
        return data

    def create(self, validated_data):
        return Payment.objects.create(
            invoice=self.context['invoice'],
            received_by=self.context['request'].user,
            **validated_data,
        )
