from django import forms

from login.models import CustomUser


class ProfileUpdateForm(forms.ModelForm):
    class Meta:
        model = CustomUser
        fields = ["first_name", "last_name"]
