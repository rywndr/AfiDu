from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect, render
from django.views import View

from .forms import RegistrationForm


# Create your views here.
class RegistrationContextMixin:
    def get_registration_context(self):
        return {
            "active_tab_title": "Register",
            "active_tab_icon": "fa-user-plus",
        }
    
    def get_context_data(self, extra_context=None):
        context = {}
        context.update(self.get_registration_context())
        if extra_context:
            context.update(extra_context)
        return context

class RegisterView(LoginRequiredMixin, RegistrationContextMixin, View):
    def get(self, request, *args, **kwargs):
        # untuk menampilkan form register
        form = RegistrationForm()
        context = self.get_context_data({"form": form})
        return render(request, "register/register.html", context)

    def post(self, request, *args, **kwargs):
        # untuk memproses form register
        form = RegistrationForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect("register:register_success")
        context = self.get_context_data({"form": form})
        return render(request, "register/register.html", context)

class RegisterSuccessView(LoginRequiredMixin, RegistrationContextMixin, View):
    def get(self, request, *args, **kwargs):
        # untuk menampilkan halaman sukses register
        context = self.get_context_data()
        messages.success(request, "Your account has been successfully created!")
        return render(request, "register/register_success.html", context)