from django.contrib.auth.views import LoginView

from .forms import EmailAuthenticationForm


# Create your views here.
class CustomLoginView(LoginView):
    authentication_form = EmailAuthenticationForm
    template_name = "auth/login.html"


def form_valid(self, form):
    remember_me = form.cleaned_data["remember_me"]

    if not remember_me:
        # sesi exp saat browser ditutup
        self.request.session.set_expiry(0)
    else:
        # sesi exp dalam 2 minggu (1209600 detik / 14 hari)
        self.request.session.set_expiry(1209600)

    return super().form_valid(form)
