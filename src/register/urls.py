from django.urls import path

from .views import RegisterView, RegisterSuccessView

app_name = "register"

urlpatterns = [
    path("", RegisterView.as_view(), name="register"),
    path("success/", RegisterSuccessView.as_view(), name="register_success"),
]
