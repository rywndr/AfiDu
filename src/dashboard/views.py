from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from students.models import Student


# Create your views here.
@login_required
def dashboard(request):
    student_count = Student.objects.count()
    context = {
        "student_count": student_count,
        "active_tab_title": "Dashboard",
        "active_tab_icon": "fa-tachometer-alt",
    }
    return render(request, "dashboard/dashboard.html", context)
