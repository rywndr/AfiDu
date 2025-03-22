from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from .forms import ProfileUpdateForm


# Create your views here.
@login_required
def profile(request):
    context = {
        "user": request.user,
        "active_tab_title": "Profile",
        "active_tab_icon": "fa-user",
    }
    # hanya untuk display profile user
    return render(request, "myprofile/profile.html", context)


@login_required
def edit_profile(request):
    # untuk edit profile user
    user = request.user
    if request.method == "POST":
        form = ProfileUpdateForm(request.POST, instance=user)
        if form.is_valid():
            form.save()
            return redirect("myprofile:profile")
    else:
        form = ProfileUpdateForm(instance=user)
    context = {
        "form": form,
        "user": user,
        "active_tab_title": "Edit Profile",
        "active_tab_icon": "fa-user-edit",
    }
    return render(request, "myprofile/edit_profile.html", context)
