from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
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
        # untuk edit profile user
        return self.request.user
    
    def form_valid(self, form):
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