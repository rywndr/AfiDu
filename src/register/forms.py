from django import forms
from django.core.exceptions import ValidationError
import re

from login.models import CustomUser


class RegistrationForm(forms.ModelForm):
    ROLE_CHOICES = CustomUser.ROLE_CHOICES

    role = forms.ChoiceField(
        choices=ROLE_CHOICES,
        label="Permission",
        widget=forms.Select(
            attrs={
                "class": "w-80 px-2 py-1 border border-gray-300 rounded \
                      focus:outline-none focus:ring-1 focus:ring-[#ff4f25]"
            }
        ),
    )

    password1 = forms.CharField(
        label="Password",
        widget=forms.PasswordInput(
            attrs={
                "class": "w-80 px-2 py-1 pr-10 border border-gray-300 rounded \
                      focus:outline-none focus:ring-1 focus:ring-[#ff4f25]"
            }
        ),
        help_text="Password must be at least 8 characters and contain numbers, uppercase and lowercase letters.",
    )
    password2 = forms.CharField(
        label="Confirm Password",
        widget=forms.PasswordInput(
            attrs={
                "class": "w-80 px-2 py-1 pr-10 border border-gray-300 rounded \
                      focus:outline-none focus:ring-1 focus:ring-[#ff4f25]"
            }
        ),
        help_text="Enter the same password again for verification.",
    )

    class Meta:
        model = CustomUser
        fields = [
            "email",
            "first_name",
            "last_name",
            "role",
        ]

    def clean_email(self):
        email = self.cleaned_data.get("email")
        if CustomUser.objects.filter(email=email).exists():
            raise forms.ValidationError("A user with this email already exists.")
        return email

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password1")
        p2 = cleaned_data.get("password2")
        
        # check if passwords match
        if password and p2 and password != p2:
            self.add_error(None, "The two passwords do not match.")
        
        # password validation only if password is provided
        if password:
            # check password length
            if len(password) < 8:
                self.add_error(None, "Password must be at least 8 characters long.")
                
            # check for at least one digit
            if not re.search(r'\d', password):
                self.add_error(None, "Password must contain at least one number.")
                
            # check for at least one uppercase letter
            if not re.search(r'[A-Z]', password):
                self.add_error(None, "Password must contain at least one uppercase letter.")
                
            # check for at least one lowercase letter
            if not re.search(r'[a-z]', password):
                self.add_error(None, "Password must contain at least one lowercase letter.")
        
        return cleaned_data

    def save(self, commit=True):
        user: CustomUser = super().save(commit=False)
        # set the password hash
        user.set_password(self.cleaned_data["password1"])

        role = self.cleaned_data["role"]
        user.role = role
        user.is_active = True
        if role == CustomUser.ROLE_SUPERUSER:
            # full admin
            user.is_staff = True
            user.is_superuser = True
        else:
            # Teacher: no admin access
            user.is_staff = False
            user.is_superuser = False

        if commit:
            user.save()
        return user
