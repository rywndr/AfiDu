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
class StudentListView(LoginRequiredMixin, ListView):
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
        # pass pilihan class ke template untuk dropdown filter
        context["class_choices"] = Student._meta.get_field("assigned_class").choices
        # pass item per_page context ke template untuk pagination
        context["current_per_page"] = self.request.GET.get("per_page", "5")
        return context


class StudentDetailView(LoginRequiredMixin, DetailView):
    model = Student
    template_name = "students/student_detail.html"
    context_object_name = "student"


class StudentCreateView(LoginRequiredMixin, CreateView):
    model = Student
    form_class = StudentForm
    template_name = "students/student_form.html"
    success_url = reverse_lazy("students:student-list")


class StudentUpdateView(LoginRequiredMixin, UpdateView):
    model = Student
    form_class = StudentForm
    template_name = "students/student_form.html"
    success_url = reverse_lazy("students:student-list")


class StudentDeleteView(LoginRequiredMixin, DeleteView):
    model = Student
    template_name = "students/student_confirm_delete.html"
    success_url = reverse_lazy("students:student-list")
