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

    context = {
        "form": form,
        "active_tab_title": "Register",
        "active_tab_icon": "fa-user-plus",
    }
    return render(request, "register/register.html", context)


@login_required
def register_success(request):
    context = {
        "active_tab_title": "Register",
        "active_tab_icon": "fa-user-plus",
    }
    messages.success(request, "Your account has been successfully created!")
    return render(request, "register/register_success.html", context)
