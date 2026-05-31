from datetime import timedelta

from django.core.cache import cache
from django.db.models import (
    Case, CharField, Count, ExpressionWrapper, F, IntegerField, Q, Sum, Value, When,
)
from django.db.models.functions import (
    Coalesce, ExtractYear, Now, TruncDay, TruncMonth, TruncWeek,
)
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cashier.models import Invoice, InvoiceItem, Payment
from apps.laboratory.models import LabOrder, LabOrderItem
from apps.patients.models import Patient, PatientVisit
from apps.pharmacy.models import Dispensing, Drug, Prescription, PrescriptionItem, StockItem
from apps.opd.models import Consultation

from .permissions import (
    CashierPermission, DashboardPermission, LabPermission, OpdPermission,
    PatientsPermission, PharmacyPermission, RevenuePermission,
)

CACHE_TTL = 300  # 5 minutes


def _today():
    return timezone.now().date()


def _parse_date_param(s, default=None):
    if s:
        parsed = parse_date(s)
        if parsed:
            return parsed
    return default or _today()


def _default_from():
    return _today() - timedelta(days=30)


def _cache_key(name, params):
    parts = "|".join(f"{k}={v}" for k, v in sorted(params.items()))
    return f"reports:{name}:{parts}"


def _trunc_cls(group_by):
    return {"day": TruncDay, "week": TruncWeek, "month": TruncMonth}.get(
        group_by, TruncDay
    )


def _serialize_period(p):
    """Convert Trunc result (date or datetime) to ISO date string."""
    if p is None:
        return None
    if hasattr(p, "date"):
        try:
            local_tz = timezone.get_current_timezone()
            return p.astimezone(local_tz).date().isoformat()
        except Exception:
            return str(p)[:10]
    return p.isoformat()


# ---------------------------------------------------------------------------
# 1. Dashboard Summary
# ---------------------------------------------------------------------------

class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated, DashboardPermission]

    def get(self, request):
        date_str = request.query_params.get("date", str(_today()))
        ck = _cache_key("dashboard_summary", {"date": date_str})
        cached = cache.get(ck)
        if cached:
            return Response(cached)

        d = _parse_date_param(date_str)

        patients_registered = Patient.objects.filter(created_at__date=d).count()
        opd_visits = PatientVisit.objects.filter(visit_date=d).count()
        lab_orders = LabOrder.objects.filter(ordered_at__date=d).count()
        prescriptions_dispensed = Prescription.objects.filter(
            prescribed_at__date=d, status="DISPENSED"
        ).count()

        pay_agg = Payment.objects.filter(received_at__date=d).aggregate(
            total=Coalesce(Sum("amount"), 0),
            cash=Coalesce(Sum("amount", filter=Q(payment_method="CASH")), 0),
            mobile=Coalesce(Sum("amount", filter=Q(payment_method="MOBILE_MONEY")), 0),
        )

        inv_agg = Invoice.objects.filter(created_at__date=d).aggregate(
            issued=Count(
                "id",
                filter=Q(status__in=["ISSUED", "PAID", "CANCELLED"]),
            ),
            paid=Count("id", filter=Q(status="PAID")),
            pending=Count("id", filter=Q(status="ISSUED")),
        )

        data = {
            "date": str(d),
            "patients_registered": patients_registered,
            "opd_visits": opd_visits,
            "lab_orders": lab_orders,
            "prescriptions_dispensed": prescriptions_dispensed,
            "total_collected_tzs": pay_agg["total"] or 0,
            "cash_collected_tzs": pay_agg["cash"] or 0,
            "mobile_money_collected_tzs": pay_agg["mobile"] or 0,
            "invoices_issued": inv_agg["issued"] or 0,
            "invoices_paid": inv_agg["paid"] or 0,
            "invoices_pending": inv_agg["pending"] or 0,
        }
        cache.set(ck, data, CACHE_TTL)
        return Response(data)


# ---------------------------------------------------------------------------
# 2. Revenue Trend
# ---------------------------------------------------------------------------

class RevenueTrendView(APIView):
    permission_classes = [IsAuthenticated, RevenuePermission]

    def get(self, request):
        qp = request.query_params
        date_from = _parse_date_param(qp.get("date_from"), _default_from())
        date_to = _parse_date_param(qp.get("date_to"), _today())
        group_by = qp.get("group_by", "day")

        ck = _cache_key(
            "revenue_trend",
            {"from": str(date_from), "to": str(date_to), "group_by": group_by},
        )
        cached = cache.get(ck)
        if cached:
            return Response(cached)

        local_tz = timezone.get_current_timezone()
        TruncFunc = _trunc_cls(group_by)

        qs = (
            Payment.objects.filter(
                received_at__date__gte=date_from,
                received_at__date__lte=date_to,
            )
            .annotate(period=TruncFunc("received_at", tzinfo=local_tz))
            .values("period")
            .annotate(
                total_tzs=Coalesce(Sum("amount"), 0),
                cash_tzs=Coalesce(Sum("amount", filter=Q(payment_method="CASH")), 0),
                mobile_money_tzs=Coalesce(
                    Sum("amount", filter=Q(payment_method="MOBILE_MONEY")), 0
                ),
                invoice_count=Count("invoice", distinct=True),
            )
            .order_by("period")
        )

        data = [
            {
                "period": _serialize_period(row["period"]),
                "total_tzs": row["total_tzs"],
                "cash_tzs": row["cash_tzs"],
                "mobile_money_tzs": row["mobile_money_tzs"],
                "invoice_count": row["invoice_count"],
            }
            for row in qs
        ]
        cache.set(ck, data, CACHE_TTL)
        return Response(data)


# ---------------------------------------------------------------------------
# 3. Revenue by Service
# ---------------------------------------------------------------------------

class RevenueByServiceView(APIView):
    permission_classes = [IsAuthenticated, RevenuePermission]

    def get(self, request):
        qp = request.query_params
        date_from = _parse_date_param(qp.get("date_from"), _default_from())
        date_to = _parse_date_param(qp.get("date_to"), _today())

        ck = _cache_key(
            "revenue_by_service", {"from": str(date_from), "to": str(date_to)}
        )
        cached = cache.get(ck)
        if cached:
            return Response(cached)

        qs = (
            InvoiceItem.objects.filter(
                invoice__created_at__date__gte=date_from,
                invoice__created_at__date__lte=date_to,
                invoice__status__in=["ISSUED", "PAID"],
            )
            .annotate(
                svc_name=Coalesce(
                    F("service_catalog__name"), F("description")
                ),
                svc_type=Coalesce(
                    F("service_catalog__service_type"), F("reference_type")
                ),
            )
            .values("svc_type", "svc_name")
            .annotate(
                total_quantity=Coalesce(Sum("quantity"), 0),
                total_tzs=Coalesce(Sum("subtotal"), 0),
            )
            .order_by("-total_tzs")
        )

        data = [
            {
                "service_type": row["svc_type"],
                "service_name": row["svc_name"],
                "total_quantity": row["total_quantity"],
                "total_tzs": row["total_tzs"],
            }
            for row in qs
        ]
        cache.set(ck, data, CACHE_TTL)
        return Response(data)


# ---------------------------------------------------------------------------
# 4. Patient Registrations
# ---------------------------------------------------------------------------

class PatientRegistrationsView(APIView):
    permission_classes = [IsAuthenticated, PatientsPermission]

    def get(self, request):
        qp = request.query_params
        date_from = _parse_date_param(qp.get("date_from"), _default_from())
        date_to = _parse_date_param(qp.get("date_to"), _today())
        group_by = qp.get("group_by", "day")

        ck = _cache_key(
            "patient_registrations",
            {"from": str(date_from), "to": str(date_to), "group_by": group_by},
        )
        cached = cache.get(ck)
        if cached:
            return Response(cached)

        local_tz = timezone.get_current_timezone()
        TruncFunc = _trunc_cls(group_by)

        qs = (
            Patient.objects.filter(
                created_at__date__gte=date_from,
                created_at__date__lte=date_to,
            )
            .annotate(period=TruncFunc("created_at", tzinfo=local_tz))
            .values("period")
            .annotate(count=Count("id"))
            .order_by("period")
        )

        data = [
            {"period": _serialize_period(row["period"]), "count": row["count"]}
            for row in qs
        ]
        cache.set(ck, data, CACHE_TTL)
        return Response(data)


# ---------------------------------------------------------------------------
# 5. Patient Demographics
# ---------------------------------------------------------------------------

class PatientDemographicsView(APIView):
    permission_classes = [IsAuthenticated, PatientsPermission]

    def get(self, request):
        ck = _cache_key("patient_demographics", {})
        cached = cache.get(ck)
        if cached:
            return Response(cached)

        # Gender breakdown
        gender_qs = (
            Patient.objects.filter(is_active=True)
            .values("gender")
            .annotate(count=Count("id"))
            .order_by("gender")
        )
        gender_labels = {"M": "Male", "F": "Female", "OTHER": "Other"}
        gender = [
            {"label": gender_labels.get(row["gender"], row["gender"]), "count": row["count"]}
            for row in gender_qs
        ]

        # Age groups using Case/When on annotated approximate age
        age_qs = (
            Patient.objects.filter(is_active=True)
            .annotate(
                approx_age=ExpressionWrapper(
                    ExtractYear(Now()) - ExtractYear("date_of_birth"),
                    output_field=IntegerField(),
                )
            )
            .annotate(
                age_group=Case(
                    When(approx_age__lte=12, then=Value("0-12")),
                    When(approx_age__lte=17, then=Value("13-17")),
                    When(approx_age__lte=35, then=Value("18-35")),
                    When(approx_age__lte=60, then=Value("36-60")),
                    default=Value("60+"),
                    output_field=CharField(),
                )
            )
            .values("age_group")
            .annotate(count=Count("id"))
            .order_by("age_group")
        )
        age_order = ["0-12", "13-17", "18-35", "36-60", "60+"]
        age_map = {row["age_group"]: row["count"] for row in age_qs}
        age_groups = [
            {"label": label, "count": age_map.get(label, 0)} for label in age_order
        ]

        # Blood group breakdown
        blood_qs = (
            Patient.objects.filter(is_active=True)
            .values("blood_group")
            .annotate(count=Count("id"))
            .order_by("blood_group")
        )
        blood_labels = {
            "A_POS": "A+", "A_NEG": "A-", "B_POS": "B+", "B_NEG": "B-",
            "AB_POS": "AB+", "AB_NEG": "AB-", "O_POS": "O+", "O_NEG": "O-",
            "UNKNOWN": "Unknown",
        }
        blood_groups = [
            {
                "label": blood_labels.get(row["blood_group"], row["blood_group"]),
                "count": row["count"],
            }
            for row in blood_qs
        ]

        data = {
            "gender": gender,
            "age_groups": age_groups,
            "blood_groups": blood_groups,
        }
        cache.set(ck, data, CACHE_TTL)
        return Response(data)


# ---------------------------------------------------------------------------
# 6. OPD Visits
# ---------------------------------------------------------------------------

class OpdVisitsView(APIView):
    permission_classes = [IsAuthenticated, OpdPermission]

    def get(self, request):
        qp = request.query_params
        date_from = _parse_date_param(qp.get("date_from"), _default_from())
        date_to = _parse_date_param(qp.get("date_to"), _today())
        group_by = qp.get("group_by", "day")

        ck = _cache_key(
            "opd_visits",
            {"from": str(date_from), "to": str(date_to), "group_by": group_by},
        )
        cached = cache.get(ck)
        if cached:
            return Response(cached)

        base_qs = PatientVisit.objects.filter(
            visit_date__gte=date_from,
            visit_date__lte=date_to,
        )

        # Period trend — visit_date is a DateField; Trunc still works
        local_tz = timezone.get_current_timezone()
        TruncFunc = _trunc_cls(group_by)

        trend_qs = (
            base_qs.annotate(period=TruncFunc("visit_date", tzinfo=local_tz))
            .values("period")
            .annotate(count=Count("id"))
            .order_by("period")
        )

        periods = []
        visit_counts = []
        for row in trend_qs:
            periods.append(_serialize_period(row["period"]))
            visit_counts.append(row["count"])

        # Triage breakdown
        triage_qs = (
            base_qs.exclude(triage_level__isnull=True)
            .values("triage_level")
            .annotate(count=Count("id"))
        )
        triage_map = {str(row["triage_level"]): row["count"] for row in triage_qs}
        by_triage = {str(lvl): triage_map.get(str(lvl), 0) for lvl in range(1, 6)}

        data = {
            "periods": periods,
            "visit_counts": visit_counts,
            "by_triage_level": by_triage,
        }
        cache.set(ck, data, CACHE_TTL)
        return Response(data)


# ---------------------------------------------------------------------------
# 7. Top Diagnoses
# ---------------------------------------------------------------------------

class TopDiagnosesView(APIView):
    permission_classes = [IsAuthenticated, OpdPermission]

    def get(self, request):
        qp = request.query_params
        date_from = _parse_date_param(qp.get("date_from"), _default_from())
        date_to = _parse_date_param(qp.get("date_to"), _today())
        limit = max(1, min(int(qp.get("limit", 10)), 100))

        ck = _cache_key(
            "top_diagnoses",
            {"from": str(date_from), "to": str(date_to), "limit": limit},
        )
        cached = cache.get(ck)
        if cached:
            return Response(cached)

        qs = (
            Consultation.objects.filter(
                started_at__date__gte=date_from,
                started_at__date__lte=date_to,
            )
            .exclude(diagnosis_primary="")
            .values("diagnosis_primary")
            .annotate(count=Count("id"))
            .order_by("-count")[:limit]
        )

        data = [
            {"diagnosis": row["diagnosis_primary"], "count": row["count"]}
            for row in qs
        ]
        cache.set(ck, data, CACHE_TTL)
        return Response(data)


# ---------------------------------------------------------------------------
# 8. Lab Test Volumes
# ---------------------------------------------------------------------------

class LabTestVolumesView(APIView):
    permission_classes = [IsAuthenticated, LabPermission]

    def get(self, request):
        qp = request.query_params
        date_from = _parse_date_param(qp.get("date_from"), _default_from())
        date_to = _parse_date_param(qp.get("date_to"), _today())

        ck = _cache_key(
            "lab_test_volumes", {"from": str(date_from), "to": str(date_to)}
        )
        cached = cache.get(ck)
        if cached:
            return Response(cached)

        qs = (
            LabOrderItem.objects.filter(
                order__ordered_at__date__gte=date_from,
                order__ordered_at__date__lte=date_to,
            )
            .values(
                test_name=F("test__name"),
                category=F("test__category"),
            )
            .annotate(
                total_ordered=Count("id"),
                total_resulted=Count(
                    "id",
                    filter=Q(status__in=["RESULTED", "VERIFIED"]),
                ),
            )
            .order_by("-total_ordered")
        )

        data = []
        for row in qs:
            ordered = row["total_ordered"]
            resulted = row["total_resulted"]
            rate = round(resulted / ordered * 100, 1) if ordered else 0.0
            data.append(
                {
                    "test_name": row["test_name"],
                    "category": row["category"],
                    "total_ordered": ordered,
                    "total_resulted": resulted,
                    "completion_rate_pct": rate,
                }
            )
        cache.set(ck, data, CACHE_TTL)
        return Response(data)


# ---------------------------------------------------------------------------
# 9. Pharmacy Dispensing
# ---------------------------------------------------------------------------

class PharmacyDispensingView(APIView):
    permission_classes = [IsAuthenticated, PharmacyPermission]

    def get(self, request):
        qp = request.query_params
        date_from = _parse_date_param(qp.get("date_from"), _default_from())
        date_to = _parse_date_param(qp.get("date_to"), _today())

        ck = _cache_key(
            "pharmacy_dispensing", {"from": str(date_from), "to": str(date_to)}
        )
        cached = cache.get(ck)
        if cached:
            return Response(cached)

        total_prescriptions = Prescription.objects.filter(
            prescribed_at__date__gte=date_from,
            prescribed_at__date__lte=date_to,
        ).exclude(status="CANCELLED").count()

        items_agg = PrescriptionItem.objects.filter(
            prescription__prescribed_at__date__gte=date_from,
            prescription__prescribed_at__date__lte=date_to,
        ).aggregate(total=Coalesce(Sum("quantity_dispensed"), 0))
        total_items_dispensed = items_agg["total"]

        top_drugs_qs = (
            Dispensing.objects.filter(
                dispensed_at__date__gte=date_from,
                dispensed_at__date__lte=date_to,
            )
            .values(drug_name=F("prescription_item__drug__name"))
            .annotate(
                qty_sum=Coalesce(Sum("quantity_dispensed"), 0),
                total_tzs=Coalesce(
                    Sum(
                        ExpressionWrapper(
                            F("quantity_dispensed") * F("stock_item__selling_price"),
                            output_field=IntegerField(),
                        )
                    ),
                    0,
                ),
            )
            .order_by("-qty_sum")[:20]
        )

        top_drugs = [
            {
                "drug_name": row["drug_name"],
                "quantity_dispensed": row["qty_sum"],
                "total_tzs": row["total_tzs"],
            }
            for row in top_drugs_qs
        ]

        data = {
            "total_prescriptions": total_prescriptions,
            "total_items_dispensed": total_items_dispensed,
            "top_drugs": top_drugs,
        }
        cache.set(ck, data, CACHE_TTL)
        return Response(data)


# ---------------------------------------------------------------------------
# 10. Pharmacy Stock Status
# ---------------------------------------------------------------------------

class PharmacyStockStatusView(APIView):
    permission_classes = [IsAuthenticated, PharmacyPermission]

    def get(self, request):
        ck = _cache_key("pharmacy_stock_status", {})
        cached = cache.get(ck)
        if cached:
            return Response(cached)

        today = _today()
        in_30_days = today + timedelta(days=30)

        total_drugs = Drug.objects.filter(is_active=True).count()

        # Aggregate total qty per drug across all stock items
        drug_qty_qs = Drug.objects.filter(is_active=True).annotate(
            total_qty=Coalesce(Sum("stock_items__quantity_in_stock"), 0)
        )
        low_stock_count = drug_qty_qs.filter(
            total_qty__gt=0,
            total_qty__lte=F("reorder_level"),
        ).count()
        out_of_stock_count = drug_qty_qs.filter(total_qty=0).count()

        expiring_30_days = StockItem.objects.filter(
            quantity_in_stock__gt=0,
            expiry_date__gte=today,
            expiry_date__lte=in_30_days,
        ).count()

        low_stock_items_qs = (
            StockItem.objects.filter(
                quantity_in_stock__gt=0,
                quantity_in_stock__lte=F("drug__reorder_level"),
            )
            .values(
                drug_name=F("drug__name"),
                current_qty=F("quantity_in_stock"),
                reorder_level=F("drug__reorder_level"),
                location=F("location"),
            )
            .order_by("quantity_in_stock")[:50]
        )

        data = {
            "total_drugs": total_drugs,
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count,
            "expiring_30_days": expiring_30_days,
            "low_stock_items": list(low_stock_items_qs),
        }
        cache.set(ck, data, CACHE_TTL)
        return Response(data)


# ---------------------------------------------------------------------------
# 11. Cashier Daily Summary
# ---------------------------------------------------------------------------

class CashierDailySummaryView(APIView):
    permission_classes = [IsAuthenticated, CashierPermission]

    def get(self, request):
        date_str = request.query_params.get("date", str(_today()))
        ck = _cache_key("cashier_daily_summary", {"date": date_str})
        cached = cache.get(ck)
        if cached:
            return Response(cached)

        d = _parse_date_param(date_str)

        inv_agg = Invoice.objects.filter(created_at__date=d).aggregate(
            total_invoices=Count("id"),
            paid=Count("id", filter=Q(status="PAID")),
            pending=Count("id", filter=Q(status="ISSUED")),
            cancelled=Count("id", filter=Q(status="CANCELLED")),
            total_cash_tzs=Coalesce(
                Sum(
                    "amount_paid",
                    filter=Q(payments__payment_method="CASH"),
                ),
                0,
            ),
            total_mobile_money_tzs=Coalesce(
                Sum(
                    "amount_paid",
                    filter=Q(payments__payment_method="MOBILE_MONEY"),
                ),
                0,
            ),
        )

        # Get cash/mobile totals from Payment directly to avoid double-counting
        pay_agg = Payment.objects.filter(received_at__date=d).aggregate(
            total_cash_tzs=Coalesce(Sum("amount", filter=Q(payment_method="CASH")), 0),
            total_mobile_money_tzs=Coalesce(
                Sum("amount", filter=Q(payment_method="MOBILE_MONEY")), 0
            ),
        )

        payments_qs = (
            Payment.objects.filter(received_at__date=d)
            .select_related("invoice", "invoice__patient", "received_by")
            .order_by("received_at")
        )

        payments = []
        for p in payments_qs:
            patient = p.invoice.patient
            payments.append(
                {
                    "time": p.received_at.astimezone(
                        timezone.get_current_timezone()
                    ).strftime("%H:%M"),
                    "invoice_number": p.invoice.invoice_number,
                    "patient_name": f"{patient.first_name} {patient.last_name}".strip(),
                    "amount_tzs": p.amount,
                    "method": p.payment_method,
                    "received_by": p.received_by.get_full_name() or p.received_by.username,
                }
            )

        data = {
            "summary": {
                "total_invoices": inv_agg["total_invoices"] or 0,
                "paid": inv_agg["paid"] or 0,
                "pending": inv_agg["pending"] or 0,
                "cancelled": inv_agg["cancelled"] or 0,
                "total_cash_tzs": pay_agg["total_cash_tzs"],
                "total_mobile_money_tzs": pay_agg["total_mobile_money_tzs"],
            },
            "payments": payments,
        }
        cache.set(ck, data, CACHE_TTL)
        return Response(data)
