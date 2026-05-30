from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),
    # JWT auth
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Module APIs
    path("api/patients/", include("apps.patients.urls", namespace="patients")),
    path("api/opd/", include("apps.opd.urls", namespace="opd")),
    path("api/laboratory/", include("apps.laboratory.urls", namespace="laboratory")),
    path("api/pharmacy/", include("apps.pharmacy.urls", namespace="pharmacy")),
    path("api/cashier/", include("apps.cashier.urls", namespace="cashier")),
    path("api/rooms/", include("apps.rooms.urls", namespace="rooms")),
    path("api/reports/", include("apps.reports.urls", namespace="reports")),
]
