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
    # classes urls
    path("classes/", StudentClassListView.as_view(), name="class-list"),
    path("classes/add/", StudentClassCreateView.as_view(), name="class-add"),
    path("classes/<slug:slug>/edit/", StudentClassUpdateView.as_view(), name="class-edit"),
    path("classes/<slug:slug>/delete/", StudentClassDeleteView.as_view(), name="class-delete"),

    # student urls
    path("", StudentListView.as_view(), name="student-list"),
    path("add/", StudentCreateView.as_view(), name="student-add"),
    path("<slug:public_id>/", StudentDetailView.as_view(), name="student-detail"),
    path("<slug:public_id>/edit/", StudentUpdateView.as_view(), name="student-edit"),
    path("<slug:public_id>/delete/", StudentDeleteView.as_view(), name="student-delete"),
]
