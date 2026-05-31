from rest_framework import serializers

from .models import (
    Dispensing,
    Drug,
    Prescription,
    PrescriptionItem,
    StockItem,
    StockMovement,
)


# ── Drug ────────────────────────────────────────────────────────────────────────

class DrugSerializer(serializers.ModelSerializer):
    class Meta:
        model = Drug
        fields = [
            'id', 'drug_code', 'name', 'brand_name', 'formulation', 'strength',
            'unit_of_measure', 'category', 'requires_prescription',
            'is_controlled_substance', 'reorder_level', 'is_active',
        ]


# ── Stock ────────────────────────────────────────────────────────────────────────

class StockMovementSerializer(serializers.ModelSerializer):
    moved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StockMovement
        fields = [
            'id', 'movement_type', 'quantity', 'reference_number',
            'moved_by', 'moved_by_name', 'moved_at', 'notes',
        ]
        read_only_fields = fields

    def get_moved_by_name(self, obj):
        return obj.moved_by.get_full_name() or obj.moved_by.username


class StockItemSerializer(serializers.ModelSerializer):
    drug_name = serializers.CharField(source='drug.name', read_only=True)
    drug_code = serializers.CharField(source='drug.drug_code', read_only=True)
    drug_strength = serializers.CharField(source='drug.strength', read_only=True)
    drug_formulation = serializers.CharField(source='drug.formulation', read_only=True)
    drug_unit = serializers.CharField(source='drug.unit_of_measure', read_only=True)
    drug_reorder_level = serializers.IntegerField(source='drug.reorder_level', read_only=True)
    received_by_name = serializers.SerializerMethodField()
    is_low_stock = serializers.SerializerMethodField()

    class Meta:
        model = StockItem
        fields = [
            'id', 'drug', 'drug_name', 'drug_code', 'drug_strength',
            'drug_formulation', 'drug_unit', 'drug_reorder_level',
            'batch_number', 'expiry_date', 'quantity_in_stock',
            'unit_cost', 'selling_price', 'supplier', 'location',
            'received_at', 'received_by', 'received_by_name', 'is_low_stock',
        ]
        read_only_fields = ['received_at', 'received_by', 'received_by_name', 'is_low_stock']

    def get_received_by_name(self, obj):
        return obj.received_by.get_full_name() or obj.received_by.username

    def get_is_low_stock(self, obj):
        return obj.quantity_in_stock <= obj.drug.reorder_level


class StockItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockItem
        fields = [
            'drug', 'batch_number', 'expiry_date', 'quantity_in_stock',
            'unit_cost', 'selling_price', 'supplier', 'location',
        ]

    def create(self, validated_data):
        initial_quantity = validated_data.pop('quantity_in_stock', 0)
        validated_data['received_by'] = self.context['request'].user
        validated_data['quantity_in_stock'] = 0
        stock_item = StockItem.objects.create(**validated_data)
        if initial_quantity > 0:
            StockMovement.objects.create(
                stock_item=stock_item,
                movement_type=StockMovement.MovementType.RECEIVE,
                quantity=initial_quantity,
                moved_by=self.context['request'].user,
            )
        return stock_item


class StockTransferSerializer(serializers.Serializer):
    stock_item_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


# ── Prescription ────────────────────────────────────────────────────────────────

class PrescriptionItemReadSerializer(serializers.ModelSerializer):
    drug_name = serializers.CharField(source='drug.name', read_only=True)
    drug_code = serializers.CharField(source='drug.drug_code', read_only=True)
    drug_strength = serializers.CharField(source='drug.strength', read_only=True)
    drug_formulation = serializers.CharField(source='drug.formulation', read_only=True)
    drug_unit = serializers.CharField(source='drug.unit_of_measure', read_only=True)

    class Meta:
        model = PrescriptionItem
        fields = [
            'id', 'drug', 'drug_name', 'drug_code', 'drug_strength',
            'drug_formulation', 'drug_unit',
            'dose', 'frequency', 'duration', 'instructions',
            'quantity_prescribed', 'quantity_dispensed', 'status',
        ]


class PrescriptionItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionItem
        fields = [
            'drug', 'dose', 'frequency', 'duration', 'instructions',
            'quantity_prescribed',
        ]


class PrescriptionSerializer(serializers.ModelSerializer):
    items = PrescriptionItemReadSerializer(many=True, read_only=True)
    patient_display = serializers.SerializerMethodField()
    prescribed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Prescription
        fields = [
            'id', 'prescription_number', 'patient', 'patient_display',
            'visit', 'prescribed_by', 'prescribed_by_name', 'prescribed_at',
            'status', 'notes', 'items',
        ]
        read_only_fields = [
            'id', 'prescription_number', 'prescribed_by', 'prescribed_at', 'status',
        ]

    def get_patient_display(self, obj):
        p = obj.patient
        return {
            'patient_id': p.patient_id,
            'name': ' '.join(filter(None, [p.first_name, p.middle_name, p.last_name])),
            'phone': p.phone_primary,
        }

    def get_prescribed_by_name(self, obj):
        return obj.prescribed_by.get_full_name() or obj.prescribed_by.username


class PrescriptionWriteSerializer(serializers.ModelSerializer):
    items = PrescriptionItemWriteSerializer(many=True, write_only=True)

    class Meta:
        model = Prescription
        fields = ['patient', 'visit', 'notes', 'items']

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        validated_data['prescribed_by'] = self.context['request'].user
        prescription = Prescription.objects.create(**validated_data)
        PrescriptionItem.objects.bulk_create([
            PrescriptionItem(prescription=prescription, **item) for item in items_data
        ])
        return prescription


# ── Dispensing ──────────────────────────────────────────────────────────────────

class DispensingSerializer(serializers.ModelSerializer):
    drug_name = serializers.CharField(
        source='prescription_item.drug.name', read_only=True
    )
    dispensed_by_name = serializers.SerializerMethodField()
    batch_number = serializers.CharField(source='stock_item.batch_number', read_only=True)

    class Meta:
        model = Dispensing
        fields = [
            'id', 'prescription_item', 'drug_name', 'stock_item', 'batch_number',
            'quantity_dispensed', 'dispensed_by', 'dispensed_by_name',
            'dispensed_at', 'notes',
        ]
        read_only_fields = fields

    def get_dispensed_by_name(self, obj):
        return obj.dispensed_by.get_full_name() or obj.dispensed_by.username


class DispenseInputSerializer(serializers.Serializer):
    prescription_item_id = serializers.IntegerField()
    stock_item_id = serializers.IntegerField()
    quantity_dispensed = serializers.IntegerField(min_value=1)


# ── Queue ────────────────────────────────────────────────────────────────────────

class DispensingQueueSerializer(serializers.ModelSerializer):
    items = PrescriptionItemReadSerializer(many=True, read_only=True)
    patient_display = serializers.SerializerMethodField()
    prescribed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Prescription
        fields = [
            'id', 'prescription_number', 'patient', 'patient_display',
            'visit', 'prescribed_by', 'prescribed_by_name', 'prescribed_at',
            'status', 'notes', 'items',
        ]

    def get_patient_display(self, obj):
        p = obj.patient
        return {
            'patient_id': p.patient_id,
            'name': ' '.join(filter(None, [p.first_name, p.middle_name, p.last_name])),
            'phone': p.phone_primary,
        }

    def get_prescribed_by_name(self, obj):
        return obj.prescribed_by.get_full_name() or obj.prescribed_by.username
