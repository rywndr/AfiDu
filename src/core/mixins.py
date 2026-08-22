# Access-control mixins shared by every internal (Django-side) view.

from functools import wraps

from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.shortcuts import render


def user_is_staff(user):
    """Teachers and superusers may use the internal app; students may not."""
    if not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return not getattr(user, "is_student", False)


def user_is_superuser(user):
    return user.is_authenticated and user.is_superuser


class Custom403Mixin:
    """
    Render the project's 403 page for authenticated-but-unauthorized users,
    and fall back to the normal login redirect for anonymous ones.
    """

    def handle_no_permission(self):
        if self.request.user.is_authenticated:
            return render(self.request, "403.html", status=403)
        return super().handle_no_permission()


class StaffRequiredMixin(LoginRequiredMixin, Custom403Mixin, UserPassesTestMixin):
    """Allow teachers and superusers. Reject students."""

    def test_func(self):
        return user_is_staff(self.request.user)


class SuperuserRequiredMixin(LoginRequiredMixin, Custom403Mixin, UserPassesTestMixin):
    """Allow superusers only."""

    def test_func(self):
        return user_is_superuser(self.request.user)


def staff_required(view_func):
    """Function-view equivalent of :class:`StaffRequiredMixin`."""

    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        if not user_is_staff(request.user):
            if request.user.is_authenticated:
                return render(request, "403.html", status=403)
            from django.contrib.auth.views import redirect_to_login

            return redirect_to_login(request.get_full_path())
        return view_func(request, *args, **kwargs)

    return _wrapped


def superuser_required(view_func):
    """Function-view equivalent of :class:`SuperuserRequiredMixin`."""

    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        if not user_is_superuser(request.user):
            if request.user.is_authenticated:
                return render(request, "403.html", status=403)
            from django.contrib.auth.views import redirect_to_login

            return redirect_to_login(request.get_full_path())
        return view_func(request, *args, **kwargs)

    return _wrapped
