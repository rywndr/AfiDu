from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.views.generic import (
    CreateView,
    DeleteView,
    DetailView,
    ListView,
    UpdateView,
)

from .forms import StudentForm
from .models import Student


# Create your views here.
class StudentContextMixin:
    def get_student_context(self):
        extra = {
            "active_tab_title": "Students",
            "active_tab_icon": "fa-user-graduate",
            "class_choices": Student._meta.get_field("assigned_class").choices,
        }
        return extra

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update(self.get_student_context())
        return context


class StudentListView(LoginRequiredMixin, StudentContextMixin, ListView):
    model = Student
    template_name = "students/student_list.html"
    context_object_name = "students"
    
    def get_queryset(self):
        queryset = super().get_queryset()
        query = self.request.GET.get("q")
        class_filter = self.request.GET.get("class_filter")
        if query:
            queryset = queryset.filter(name__icontains=query)
        if class_filter:
            queryset = queryset.filter(assigned_class=class_filter)
        return queryset

    def get_paginate_by(self, queryset):
        per_page = self.request.GET.get("per_page")
        if per_page in ["5", "10", "15"]:
            return int(per_page)
        return 5

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        # pass student count context ke list view
        context["student_count"] = self.get_queryset().count()
        # persist state item per_page
        context["current_per_page"] = self.request.GET.get("per_page", "5")
        return context


class StudentDetailView(LoginRequiredMixin, StudentContextMixin, DetailView):
    model = Student
    template_name = "students/student_detail.html"
    context_object_name = "student"


class StudentCreateView(LoginRequiredMixin, StudentContextMixin, CreateView):
    model = Student
    form_class = StudentForm
    template_name = "students/student_form.html"
    success_url = reverse_lazy("students:student-list")


class StudentUpdateView(LoginRequiredMixin, StudentContextMixin, UpdateView):
    model = Student
    form_class = StudentForm
    template_name = "students/student_form.html"
    success_url = reverse_lazy("students:student-list")


class StudentDeleteView(LoginRequiredMixin, StudentContextMixin, DeleteView):
    model = Student
    template_name = "students/student_confirm_delete.html"
    success_url = reverse_lazy("students:student-list")