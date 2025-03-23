from django.urls import path

from .views import ProfileView, EditProfileView

app_name = "myprofile"

urlpatterns = [
    path("", ProfileView.as_view(), name="profile"),
    path("edit/", EditProfileView.as_view(), name="edit_profile"),
]
