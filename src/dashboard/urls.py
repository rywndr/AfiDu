from django.urls import include, path

from . import views

app_name = "dashboard"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("register/", include("register.urls"), name="register"),
]
