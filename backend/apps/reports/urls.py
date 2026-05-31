from django.urls import path

from .views import (
    CashierDailySummaryView,
    DashboardSummaryView,
    LabTestVolumesView,
    OpdVisitsView,
    PatientDemographicsView,
    PatientRegistrationsView,
    PharmacyDispensingView,
    PharmacyStockStatusView,
    RevenueByServiceView,
    RevenueTrendView,
    TopDiagnosesView,
)

app_name = "reports"

urlpatterns = [
    # Dashboard
    path("dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    # Revenue
    path("revenue/trend/", RevenueTrendView.as_view(), name="revenue-trend"),
    path("revenue/by-service/", RevenueByServiceView.as_view(), name="revenue-by-service"),
    # Patients
    path("patients/registrations/", PatientRegistrationsView.as_view(), name="patient-registrations"),
    path("patients/demographics/", PatientDemographicsView.as_view(), name="patient-demographics"),
    # OPD
    path("opd/visits/", OpdVisitsView.as_view(), name="opd-visits"),
    path("opd/top-diagnoses/", TopDiagnosesView.as_view(), name="opd-top-diagnoses"),
    # Lab
    path("lab/test-volumes/", LabTestVolumesView.as_view(), name="lab-test-volumes"),
    # Pharmacy
    path("pharmacy/dispensing/", PharmacyDispensingView.as_view(), name="pharmacy-dispensing"),
    path("pharmacy/stock-status/", PharmacyStockStatusView.as_view(), name="pharmacy-stock-status"),
    # Cashier
    path("cashier/daily-summary/", CashierDailySummaryView.as_view(), name="cashier-daily-summary"),
]
