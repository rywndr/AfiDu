from django.urls import include, path

app_name = "login"

urlpatterns = [
    path("", include("django.contrib.auth.urls"), name="login"),
]
