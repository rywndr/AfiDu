from django.urls import path

from .views import edit_profile, profile

app_name = "myprofile"

urlpatterns = [
    path("", profile, name="profile"),
    path("edit/", edit_profile, name="edit_profile"),
]
