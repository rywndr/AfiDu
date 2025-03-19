from django.urls import path

from .views import (
    StudentCreateView,
    StudentDeleteView,
    StudentDetailView,
    StudentListView,
    StudentUpdateView,
)

app_name = "students"

urlpatterns = [
    path("", StudentListView.as_view(), name="student-list"),
    path("add/", StudentCreateView.as_view(), name="student-add"),
    path("<int:pk>/", StudentDetailView.as_view(), name="student-detail"),
    path("<int:pk>/edit/", StudentUpdateView.as_view(), name="student-edit"),
    path("<int:pk>/delete/", StudentDeleteView.as_view(), name="student-delete"),
]
