from django.urls import include, path

from .views import DashboardView

app_name = "dashboard"

urlpatterns = [
    path("", DashboardView.as_view(), name="dashboard"),
    path("register/", include("register.urls"), name="register"),
]
