from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect, render
from django.views import View

from .forms import RegistrationForm


# Create your views here.
class RegisterView(LoginRequiredMixin, View):
    def get(self, request, *args, **kwargs):
        # untuk menampilkan form register
        form = RegistrationForm()
        context = {
            "form": form,
            "active_tab_title": "Register",
            "active_tab_icon": "fa-user-plus",
        }
        return render(request, "register/register.html", context)

    def post(self, request, *args, **kwargs):
        # untuk memproses form register
        form = RegistrationForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect("register:register_success")
        context = {
            "form": form,
            "active_tab_title": "Register",
            "active_tab_icon": "fa-user-plus",
        }
        return render(request, "register/register.html", context)


class RegisterSuccessView(LoginRequiredMixin, View):
    def get(self, request, *args, **kwargs):
        # untuk menampilkan halaman sukses register
        context = {
            "active_tab_title": "Register",
            "active_tab_icon": "fa-user-plus",
        }
        messages.success(request, "Your account has been successfully created!")
        return render(request, "register/register_success.html", context)