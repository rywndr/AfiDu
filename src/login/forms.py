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
        
        # match check
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError("The two passwords do not match.")
            
        # validate password
        if password1:
            error_messages = []
            
            # length check
            if len(password1) < 8:
                error_messages.append("Password must be at least 8 characters long")
                
            # digit check
            if not re.search(r'\d', password1):
                error_messages.append("Password must contain at least one number")
                
            # uppercase check
            if not re.search(r'[A-Z]', password1):
                error_messages.append("Password must contain at least one uppercase letter")
                
            # lowercase check
            if not re.search(r'[a-z]', password1):
                error_messages.append("Password must contain at least one lowercase letter")
            
            # format errors
            if error_messages:
                # single error
                if len(error_messages) == 1:
                    raise forms.ValidationError(error_messages[0])
                else:
                    # remove duplicates
                    unique_errors = []
                    for msg in error_messages:
                        if msg not in unique_errors:
                            unique_errors.append(msg)
                    
                    # keep first error as is
                    formatted_message = unique_errors[0]
                    
                    # process middle errors
                    for i in range(1, len(unique_errors) - 1):
                        msg = unique_errors[i]
                        if msg.startswith("Password must "):
                            msg = msg[14:]  # trim prefix
                        formatted_message += f", {msg}"
                        
                    # process last error
                    if len(unique_errors) > 1:
                        last_msg = unique_errors[-1]
                        if last_msg.startswith("Password must "):
                            last_msg = last_msg[14:]  # trim prefix
                        formatted_message += f" and {last_msg}"
                        
                    raise forms.ValidationError(formatted_message + ".")
        
        return password2
