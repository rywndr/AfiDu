from django import forms
from django.core.exceptions import ValidationError
from django.forms.widgets import DateInput, Select, TextInput

from .models import Student, StudentClass


class StudentForm(forms.ModelForm):
    class Meta:
        model = Student
        fields = [
            "profile_photo",
            "name",
            "gender",
            "age",
            "date_of_birth",
            "contact_number",
            "address",
            "assigned_class",
            "level",
        ]
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

        # update class dropdown to show capacity info
        choices = [("", "---------")]
        for class_obj in StudentClass.objects.all():
            if class_obj.available_spots > 0:
                label = f"{class_obj.name} ({class_obj.current_student_count}/{class_obj.max_students} students)"
            else:
                label = f"{class_obj.name} (FULL)"
            choices.append((class_obj.id, label))

        self.fields["assigned_class"].choices = choices

    def clean_assigned_class(self):
        assigned_class = self.cleaned_data.get("assigned_class")

        if assigned_class and assigned_class.is_full:
            # allow if editing existing student in same class
            if self.instance.pk and self.instance.assigned_class == assigned_class:
                return assigned_class

            raise ValidationError(
                f"Cannot assign to '{assigned_class.name}'. Class is at maximum capacity."
            )

        return assigned_class

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
