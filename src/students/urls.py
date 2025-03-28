from django.urls import path

from .views import (
    StudentListView,
    StudentDetailView,
    StudentCreateView,
    StudentUpdateView,
    StudentDeleteView,
    StudentClassListView,
    StudentClassCreateView,
    StudentClassUpdateView,
    StudentClassDeleteView,
)

app_name = "students"

urlpatterns = [
    # student urls
    path("", StudentListView.as_view(), name="student-list"),
    path("add/", StudentCreateView.as_view(), name="student-add"),
    path("<int:pk>/", StudentDetailView.as_view(), name="student-detail"),
    path("<int:pk>/edit/", StudentUpdateView.as_view(), name="student-edit"),
    path("<int:pk>/delete/", StudentDeleteView.as_view(), name="student-delete"),
    
    # classes urls
    path("classes/", StudentClassListView.as_view(), name="class-list"),
    path("classes/add/", StudentClassCreateView.as_view(), name="class-add"),
    path("classes/<int:pk>/edit/", StudentClassUpdateView.as_view(), name="class-edit"),
    path("classes/<int:pk>/delete/", StudentClassDeleteView.as_view(), name="class-delete"),
]
