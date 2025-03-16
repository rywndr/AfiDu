from django.contrib.auth.decorators import login_required
from django.shortcuts import render


# Create your views here.
@login_required
def dashboard(request):
    username = {"user": request.user}
    return render(request, "dashboard/dashboard.html", username)
