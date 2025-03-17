from django.urls import path

from .views import CustomLoginView

app_name = "login"

urlpatterns = [
    # login
    path("login/", CustomLoginView.as_view(), name="login"),
]
