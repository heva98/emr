from rest_framework import serializers

from .models import LabOrder, LabOrderItem, LabResult, LabTestCatalog


class LabTestCatalogSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTestCatalog
        fields = [
            'id', 'name', 'code', 'category', 'specimen_type',
            'normal_range_description', 'unit', 'turnaround_hours', 'price', 'is_active',
        ]


class LabResultSerializer(serializers.ModelSerializer):
    resulted_by_name = serializers.SerializerMethodField()
    verified_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LabResult
        fields = [
            'id', 'result_value', 'result_numeric', 'normal_low', 'normal_high', 'flag',
            'resulted_by', 'resulted_by_name', 'resulted_at',
            'verified_by', 'verified_by_name', 'verified_at', 'notes',
        ]
        read_only_fields = fields

    def get_resulted_by_name(self, obj):
        return obj.resulted_by.get_full_name() or obj.resulted_by.username

    def get_verified_by_name(self, obj):
        if obj.verified_by:
            return obj.verified_by.get_full_name() or obj.verified_by.username
        return None


class LabOrderItemSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source='test.name', read_only=True)
    test_code = serializers.CharField(source='test.code', read_only=True)
    test_unit = serializers.CharField(source='test.unit', read_only=True)
    result = serializers.SerializerMethodField()

    class Meta:
        model = LabOrderItem
        fields = [
            'id', 'test', 'test_name', 'test_code', 'test_unit',
            'status', 'specimen_collected_at', 'collected_by', 'result',
        ]
        read_only_fields = ['status', 'specimen_collected_at', 'collected_by']

    def get_result(self, obj):
        try:
            return LabResultSerializer(obj.result).data
        except LabResult.DoesNotExist:
            return None


class LabOrderSerializer(serializers.ModelSerializer):
    items = LabOrderItemSerializer(many=True, read_only=True)
    ordered_by_name = serializers.SerializerMethodField()
    patient_display = serializers.SerializerMethodField()
    visit_number = serializers.CharField(source='visit.visit_number', read_only=True)

    class Meta:
        model = LabOrder
        fields = [
            'id', 'order_number', 'patient', 'patient_display', 'visit', 'visit_number',
            'ordered_by', 'ordered_by_name', 'ordered_at',
            'priority', 'status', 'clinical_notes', 'items',
        ]
        read_only_fields = [
            'id', 'order_number', 'patient', 'visit', 'visit_number',
            'ordered_by', 'ordered_at', 'status',
        ]

    def get_ordered_by_name(self, obj):
        return obj.ordered_by.get_full_name() or obj.ordered_by.username

    def get_patient_display(self, obj):
        from datetime import date
        p = obj.patient
        age = None
        if p.date_of_birth:
            today = date.today()
            age = today.year - p.date_of_birth.year - (
                (today.month, today.day) < (p.date_of_birth.month, p.date_of_birth.day)
            )
        return {
            'patient_id': p.patient_id,
            'name': ' '.join(filter(None, [p.first_name, p.middle_name, p.last_name])),
            'age': age,
            'gender': p.gender,
            'gender_display': 'Male' if p.gender == 'M' else 'Female' if p.gender == 'F' else p.gender,
        }


class LabOrderWriteSerializer(serializers.ModelSerializer):
    test_ids = serializers.PrimaryKeyRelatedField(
        queryset=LabTestCatalog.objects.filter(is_active=True),
        many=True,
        write_only=True,
    )

    class Meta:
        model = LabOrder
        fields = ['patient', 'visit', 'priority', 'clinical_notes', 'test_ids']

    def validate_test_ids(self, value):
        if not value:
            raise serializers.ValidationError("At least one test must be selected.")
        return value

    def create(self, validated_data):
        tests = validated_data.pop('test_ids')
        validated_data['ordered_by'] = self.context['request'].user
        order = LabOrder.objects.create(**validated_data)
        LabOrderItem.objects.bulk_create([
            LabOrderItem(order=order, test=test) for test in tests
        ])
        return order


class CollectSpecimenSerializer(serializers.Serializer):
    collected_by = serializers.IntegerField()
    collected_at = serializers.DateTimeField()
    item_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)


class LabResultInputSerializer(serializers.Serializer):
    order_item_id = serializers.IntegerField()
    result_value = serializers.CharField()
    normal_low = serializers.FloatField(required=False, allow_null=True, default=None)
    normal_high = serializers.FloatField(required=False, allow_null=True, default=None)
    flag = serializers.ChoiceField(choices=LabResult.Flag.choices)
    notes = serializers.CharField(required=False, allow_blank=True, default='')


# ── Queue & History ─────────────────────────────────────────────────────────────

class LabQueueOrderSerializer(serializers.ModelSerializer):
    patient_display = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()
    ordered_by_name = serializers.SerializerMethodField()
    test_codes = serializers.SerializerMethodField()
    test_categories = serializers.SerializerMethodField()

    class Meta:
        model = LabOrder
        fields = [
            'id', 'order_number', 'patient_display', 'visit',
            'ordered_by_name', 'priority', 'status', 'ordered_at',
            'items_count', 'test_codes', 'test_categories',
        ]

    def get_patient_display(self, obj):
        p = obj.patient
        return {
            'patient_id': p.patient_id,
            'name': ' '.join(filter(None, [p.first_name, p.middle_name, p.last_name])),
        }

    def get_items_count(self, obj):
        return obj.items.count()

    def get_ordered_by_name(self, obj):
        return obj.ordered_by.get_full_name() or obj.ordered_by.username

    def get_test_codes(self, obj):
        return [item.test.code for item in obj.items.all()]

    def get_test_categories(self, obj):
        return list({item.test.category for item in obj.items.all()})


class LabHistoryResultSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source='order_item.test.name', read_only=True)
    test_code = serializers.CharField(source='order_item.test.code', read_only=True)
    test_unit = serializers.CharField(source='order_item.test.unit', read_only=True)

    class Meta:
        model = LabResult
        fields = [
            'id', 'test_name', 'test_code', 'test_unit',
            'result_value', 'result_numeric', 'normal_low', 'normal_high', 'flag',
            'resulted_at', 'verified_at', 'notes',
        ]


class LabHistoryOrderSerializer(serializers.ModelSerializer):
    results = serializers.SerializerMethodField()
    ordered_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LabOrder
        fields = [
            'id', 'order_number', 'visit', 'ordered_by_name',
            'ordered_at', 'priority', 'clinical_notes', 'results',
        ]

    def get_results(self, obj):
        items_with_results = [item for item in obj.items.all() if hasattr(item, 'result')]
        return LabHistoryResultSerializer(
            [item.result for item in items_with_results], many=True
        ).data

    def get_ordered_by_name(self, obj):
        return obj.ordered_by.get_full_name() or obj.ordered_by.username
