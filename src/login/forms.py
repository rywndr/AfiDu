from django import forms
from django.contrib.auth.forms import AuthenticationForm


class EmailAuthenticationForm(AuthenticationForm):
    username = forms.EmailField(label="Email")
    remember_me = forms.BooleanField(
        required=False, initial=False, widget=forms.CheckboxInput()
    )
