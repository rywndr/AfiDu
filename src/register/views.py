from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from .forms import RegistrationForm


# Create your views here.
@login_required
def register(request):
    if request.method == "POST":
        form = RegistrationForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect("register:register_success")
    else:
        form = RegistrationForm()
    return render(request, "register/register.html", {"form": form})


@login_required
def register_success(request):
    messages.success(request, "Your account has been successfully created!")
    return render(request, "register/register_success.html")
