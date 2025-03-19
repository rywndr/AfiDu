from django import forms
from django.forms.widgets import DateInput, Select, TextInput

from .models import Student


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
            "contact_number": TextInput(attrs={"placeholder": "+62XXXXXXXXXX"}),
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
