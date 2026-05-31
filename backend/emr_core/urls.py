from django.contrib import admin
from django.urls import path, include

from apps.laboratory.views import PatientLabHistoryView

urlpatterns = [
    path("admin/", admin.site.urls),
    # Auth
    path("api/auth/", include("apps.users.urls", namespace="users")),
    # Module APIs
    path("api/patients/", include("apps.patients.urls", namespace="patients")),
    path("api/patients/<int:patient_id>/lab-history/", PatientLabHistoryView.as_view(), name="patient-lab-history"),
    path("api/opd/", include("apps.opd.urls", namespace="opd")),
    path("api/laboratory/", include("apps.laboratory.urls", namespace="laboratory")),
    path("api/pharmacy/", include("apps.pharmacy.urls", namespace="pharmacy")),
    path("api/cashier/", include("apps.cashier.urls", namespace="cashier")),
    path("api/rooms/", include("apps.rooms.urls", namespace="rooms")),
    path("api/reports/", include("apps.reports.urls", namespace="reports")),
]
