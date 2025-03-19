from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from students.models import Student


# Create your views here.
@login_required
def dashboard(request):
    student_count = Student.objects.count()
    context = {"student_count": student_count}
    return render(request, "dashboard/dashboard.html", context)
