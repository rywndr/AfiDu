from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import render
from django.views import View

from students.models import Student


# Create your views here.
class DashboardView(LoginRequiredMixin, View):
    def get(self, request, *args, **kwargs):
        student_count = Student.objects.count()
        context = {
            "student_count": student_count,
            "active_tab_title": "Dashboard",
            "active_tab_icon": "fa-tachometer-alt",
        }
        return render(request, "dashboard/dashboard.html", context)