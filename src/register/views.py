from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.shortcuts import render
from django.urls import reverse_lazy
from django.views.generic import CreateView, TemplateView

from .forms import RegistrationForm


def is_superuser(user):
    return user.is_superuser


# Create your views here.
class RegistrationContextMixin:
    def get_registration_context(self):
        return {
            "active_tab_title": "Register",
            "active_tab_icon": "fa-user-plus",
        }

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update(self.get_registration_context())
        return context


class RegisterView(LoginRequiredMixin, UserPassesTestMixin, RegistrationContextMixin, CreateView):
    form_class = RegistrationForm
    template_name = "register/register.html"
    success_url = reverse_lazy("register:register_success")

    def get_context_data(self, **kwargs):
        # untuk menampilkan form register
        return super().get_context_data(**kwargs)

    def test_func(self):
        return self.request.user.is_superuser

    def handle_no_permission(self):
        """
        custom handler for when user doesn't have permission.
        renders our custom 403 template instead of default.
        """
        if self.request.user.is_authenticated:
            return render(self.request, '403.html', status=403)
        else:
            return super().handle_no_permission()


class RegisterSuccessView(LoginRequiredMixin, RegistrationContextMixin, TemplateView):
    template_name = "register/register_success.html"

    def get_context_data(self, **kwargs):
        # untuk menampilkan halaman sukses register
        return super().get_context_data(**kwargs)
