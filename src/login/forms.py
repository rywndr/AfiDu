from django import forms
from django.contrib.auth.forms import AuthenticationForm, SetPasswordForm
import re


class EmailAuthenticationForm(AuthenticationForm):
    username = forms.EmailField(label="Email")
    remember_me = forms.BooleanField(
        required=False, initial=False, widget=forms.CheckboxInput()
    )


class CustomSetPasswordForm(SetPasswordForm):
    """
    custom password reset form
    """
    def clean_new_password2(self):
        password1 = self.cleaned_data.get('new_password1')
        password2 = self.cleaned_data.get('new_password2')
        
        # basic validation
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("The two passwords do not match.")
            
        # custom validation
        if password1:
            error_messages = []
            
            # check length
            if len(password1) < 8:
                error_messages.append("Password must be at least 8 characters long")
                
            # check digit
            if not re.search(r'\d', password1):
                error_messages.append("contain at least one number")
                
            # check uppercase
            if not re.search(r'[A-Z]', password1):
                error_messages.append("contain at least one uppercase letter")
                
            # check lowercase
            if not re.search(r'[a-z]', password1):
                error_messages.append("contain at least one lowercase letter")
            
            # show errors
            if error_messages:
                # format err
                if len(error_messages) == 1:
                    raise forms.ValidationError(error_messages[0])
                else:
                    # first err
                    formatted_message = error_messages[0]
                    # add other errs
                    for msg in error_messages[1:-1]:
                        formatted_message += f", {msg}"
                    if len(error_messages) > 1:
                        formatted_message += f" and {error_messages[-1]}"
                    raise forms.ValidationError(formatted_message + ".")
        
        return password2
