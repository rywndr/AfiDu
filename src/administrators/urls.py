from django.urls import path
from . import views

app_name = "administrators"

urlpatterns = [
    # staff management routes
    path("", views.StaffListView.as_view(), name="staff-list"),
]
