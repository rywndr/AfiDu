from django import forms
from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from django.views.generic import TemplateView, UpdateView

from .forms import ProfileUpdateForm


# Create your views here.
class ProfileContextMixin:
    def get_profile_context(self, extra_context=None):
        context = {
            "active_tab_title": "Profile",
            "active_tab_icon": "fa-user",
        }
        if extra_context:
            context.update(extra_context)
        return context


class ProfileView(LoginRequiredMixin, ProfileContextMixin, TemplateView):
    template_name = "myprofile/profile.html"

    def get_context_data(self, **kwargs):
        # hanya untuk display profile user
        context = super().get_context_data(**kwargs)
        extra = {"user": self.request.user}
        context = self.get_profile_context(extra)
        return context


class EditProfileView(LoginRequiredMixin, ProfileContextMixin, UpdateView):
    form_class = ProfileUpdateForm
    template_name = "myprofile/edit_profile.html"
    success_url = reverse_lazy("myprofile:profile")

    def get_object(self):
        return self.request.user

    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        # only superusers get these extra toggles:
        if self.request.user.is_superuser:
            # boolean fields to toggle is_active, is_staff, and is_superuser
            form.fields["is_active"] = forms.BooleanField(
                required=False,
                initial=form.instance.is_active,
                label="Active",
            )
            form.fields["is_staff"] = forms.BooleanField(
                required=False,
                initial=form.instance.is_staff,
                label="Staff status",
            )
            form.fields["is_superuser"] = forms.BooleanField(
                required=False,
                initial=form.instance.is_superuser,
                label="Superuser status",
            )
        return form

    def form_valid(self, form):
        # if valid form is submitted and user is superuser then update the fields
        if self.request.user.is_superuser:
            self.object.is_active = form.cleaned_data["is_active"]
            self.object.is_staff = form.cleaned_data["is_staff"]
            self.object.is_superuser = form.cleaned_data["is_superuser"]
        messages.success(self.request, "Profile updated successfully.")
        return super().form_valid(form)

    def form_invalid(self, form):
        messages.error(self.request, "Error updating profile. Please try again.")
        return super().form_invalid(form)

    def get_context_data(self, **kwargs):
        # start with default context
        context = super().get_context_data(**kwargs)
        # tambah context tambahan dari mixin
        extra = {
            "user": self.request.user,
            "active_tab_title": "Edit Profile",
            "active_tab_icon": "fa-user-edit",
        }
        context.update(self.get_profile_context(extra))
        return context
