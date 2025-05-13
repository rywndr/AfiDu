from django import forms
from django.forms.widgets import DateInput, Select, TextInput

from .models import Student, StudentClass


class StudentForm(forms.ModelForm):
    class Meta:
        model = Student
        fields = "__all__"
        widgets = {
            "date_of_birth": DateInput(
                attrs={"type": "date", "placeholder": "Select date"}
            ),
            "address": TextInput(attrs={"placeholder": "Enter address"}),
            "name": TextInput(attrs={"placeholder": "Enter full name"}),
            "age": TextInput(attrs={"placeholder": "Enter age"}),
            "contact_number": TextInput(
                attrs={
                    "placeholder": "812XXXXXXXX",
                    "class": "phone-input-field",
                    "data-country-code": "+62",
                }
            ),
            "profile_photo": forms.ClearableFileInput(),
            "gender": Select(),
        }

    def __init__(self, *args, **kwargs):
        super(StudentForm, self).__init__(*args, **kwargs)
        # override default class isi kosong
        self.fields["assigned_class"].widget = Select(
            attrs={"placeholder": "Select class"}
        )
        # prepend opsi kosong ke opsi class
        current_class = list(self.fields["assigned_class"].choices)
        self.fields["assigned_class"].choices = [("", "Select class")] + current_class

        # override default gender isi kosong
        self.fields["gender"].widget = Select(attrs={"placeholder": "Select gender"})
        current_gender = list(self.fields["gender"].choices)
        # prepend opsi kosong ke opsi gender
        self.fields["gender"].choices = [("", "Select gender")] + current_gender

        # override default level to empty
        self.fields["level"].widget = Select(attrs={"placeholder": "Select level"})
        current_level = list(self.fields["level"].choices)
        # prepend opsi kosong ke opsi level
        self.fields["level"].choices = [("", "Select level")] + current_level

    def clean_contact_number(self):
        contact_number = self.cleaned_data.get("contact_number")

        # exit if no number
        if not contact_number:
            return contact_number

        num = str(contact_number).strip()

        # reduce to local number part
        if num.startswith("+62"):
            num = num[3:]
        elif num.startswith("62"):
            num = num[2:]
        elif num.startswith("0"):
            num = num[1:]
        # if no prefix, num is already local part

        # check local part starts with 8
        if not num.startswith("8"):
            raise forms.ValidationError("input a valid id phone number")

        # return number in +62 format
        return f"+62{num}"

class StudentClassForm(forms.ModelForm):
    class Meta:
        model = StudentClass
        fields = ["name", "description"]
        widgets = {
            "name": forms.TextInput(
                attrs={
                    "class": "w-full px-3 py-2 border border-gray-300 rounded",
                    "placeholder": "Enter class name",
                }
            ),
            "description": forms.Textarea(
                attrs={
                    "class": "w-full px-3 py-2 border border-gray-300 rounded",
                    "placeholder": "Enter description",
                    "rows": 3,
                }
            ),
        }
