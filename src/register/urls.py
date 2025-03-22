from django.urls import path

from .views import register, register_success

app_name = "register"

urlpatterns = [
    path("", register, name="register"),
    path("success/", register_success, name="register_success"),
]
