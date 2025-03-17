from django.conf import settings
from django.contrib.auth.views import (
    LoginView,
    PasswordResetCompleteView,
    PasswordResetConfirmView,
    PasswordResetDoneView,
    PasswordResetView,
)
from django.urls import reverse_lazy

from .email_backend import clear_reset_link, get_reset_email, get_reset_link
from .forms import EmailAuthenticationForm


class CustomLoginView(LoginView):
    authentication_form = EmailAuthenticationForm
    template_name = "auth/login.html"

    def form_valid(self, form):
        remember_me = form.cleaned_data["remember_me"]

        if not remember_me:
            # sesi berakhir ketika browser ditutup
            self.request.session.set_expiry(0)
        else:
            # sesi berakhir dalam waktu 2 minggu
            self.request.session.set_expiry(1209600)

        return super().form_valid(form)


class CustomPasswordResetView(PasswordResetView):
    template_name = "auth/password_reset_form.html"
    email_template_name = "auth/password_reset_email.html"
    subject_template_name = "auth/password_reset_subject.txt"
    success_url = reverse_lazy("login:password_reset_done")

    def form_valid(self, form):
        # save original email backend
        original_email_backend = settings.EMAIL_BACKEND

        # gunakan custom email backend
        settings.EMAIL_BACKEND = "login.email_backend.DisplayLinkEmailBackend"

        # call parent form_valid method
        result = super().form_valid(form)

        # restore original email backend
        settings.EMAIL_BACKEND = original_email_backend

        # simpan reset link on session
        reset_link = get_reset_link()
        reset_email = get_reset_email()

        if reset_link and reset_email:
            self.request.session["password_reset_link"] = reset_link
            self.request.session["password_reset_email"] = reset_email

        # clear thread-local storage
        clear_reset_link()

        return result


class CustomPasswordResetDoneView(PasswordResetDoneView):
    template_name = "auth/password_reset_done.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # ambil reset link dari session
        reset_link = self.request.session.get("password_reset_link", None)
        reset_email = self.request.session.get("password_reset_email", None)

        if reset_link and reset_email:
            context["reset_link"] = reset_link
            context["reset_email"] = reset_email

        return context


class CustomPasswordResetConfirmView(PasswordResetConfirmView):
    template_name = "auth/password_reset_confirm.html"
    success_url = reverse_lazy("login:password_reset_complete")


class CustomPasswordResetCompleteView(PasswordResetCompleteView):
    template_name = "auth/password_reset_complete.html"

    def get(self, request, *args, **kwargs):
        # clear reset link dari session
        if "password_reset_link" in request.session:
            del request.session["password_reset_link"]
        if "password_reset_email" in request.session:
            del request.session["password_reset_email"]

        return super().get(request, *args, **kwargs)
