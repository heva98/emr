import django_filters

from .models import Patient


class PatientFilter(django_filters.FilterSet):
    created_at_after = django_filters.DateFilter(
        field_name='created_at', lookup_expr='date__gte'
    )
    created_at_before = django_filters.DateFilter(
        field_name='created_at', lookup_expr='date__lte'
    )

    class Meta:
        model = Patient
        fields = ['gender', 'blood_group', 'is_active']
