from django.urls import path
from .views import LoginView, LogoutView, MeView, TokenRefreshCookieView

app_name = "users"

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", TokenRefreshCookieView.as_view(), name="token_refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
]
