from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.views.generic import CreateView, TemplateView

from .forms import RegistrationForm


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

class RegisterView(LoginRequiredMixin, RegistrationContextMixin, CreateView):
    form_class = RegistrationForm
    template_name = "register/register.html"
    success_url = reverse_lazy("register:register_success")

    def get_context_data(self, **kwargs):
        # untuk menampilkan form register
        return super().get_context_data(**kwargs)

class RegisterSuccessView(LoginRequiredMixin, RegistrationContextMixin, TemplateView):
    template_name = "register/register_success.html"

    def get_context_data(self, **kwargs):
        # untuk menampilkan halaman sukses register
        return super().get_context_data(**kwargs)
