from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render

from .forms import ProfileUpdateForm


# Create your views here.
@login_required
def profile(request):
    # hanya untuk display profile user
    return render(request, "myprofile/profile.html", {"user": request.user})


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
    return render(request, "myprofile/edit_profile.html", {"form": form, "user": user})
