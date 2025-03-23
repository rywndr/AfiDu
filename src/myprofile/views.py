from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import redirect, render
from django.views import View

from .forms import ProfileUpdateForm


# Create your views here.
class ProfileView(LoginRequiredMixin, View):
    def get(self, request, *args, **kwargs):
        context = {
            "user": request.user,
            "active_tab_title": "Profile",
            "active_tab_icon": "fa-user",
        }
        # hanya untuk display profile user
        return render(request, "myprofile/profile.html", context)


class EditProfileView(LoginRequiredMixin, View):
    def get(self, request, *args, **kwargs):
        # untuk edit profile user
        user = request.user
        form = ProfileUpdateForm(instance=user)
        context = {
            "form": form,
            "user": user,
            "active_tab_title": "Edit Profile",
            "active_tab_icon": "fa-user-edit",
        }
        return render(request, "myprofile/edit_profile.html", context)

    def post(self, request, *args, **kwargs):
        # untuk edit profile user
        user = request.user
        form = ProfileUpdateForm(request.POST, instance=user)
        if form.is_valid():
            form.save()
            return redirect("myprofile:profile")
        context = {
            "form": form,
            "user": user,
            "active_tab_title": "Edit Profile",
            "active_tab_icon": "fa-user-edit",
        }
        return render(request, "myprofile/edit_profile.html", context)
