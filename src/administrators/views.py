from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.views.generic import ListView
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import render
from django.core.exceptions import PermissionDenied

User = get_user_model()


# Create your views here.
class SuperuserRequiredMixin(UserPassesTestMixin):
    """
    mixin to restrict access to superusers only.
    """
    def test_func(self):
        return self.request.user.is_superuser

    def handle_no_permission(self):
        """
        custom handler for when user doesn't have permission.
        renders our custom 403 template instead of default.
        """
        if self.request.user.is_authenticated:
            return render(self.request, '403.html', status=403)
        else:
            return super().handle_no_permission()


class StaffContextMixin:
    """
    mixin to provide consistent context for staff management views.
    """
    def get_staff_context(self):
        return {
            "active_tab_title": "Staff Management",
            "active_tab_icon": "fa-users-cog",
        }

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update(self.get_staff_context())
        return context


class StaffListView(LoginRequiredMixin, SuperuserRequiredMixin, StaffContextMixin, ListView):
    """
    view to list all admins and teachers, grouped by roles.
    only accessible by superusers.
    """
    model = User
    template_name = "administrators/staff_list.html"
    context_object_name = "staff_members"

    def get_queryset(self):
        """
        get all users who are either teachers or superusers.
        """
        queryset = User.objects.filter(
            Q(role=User.ROLE_TEACHER) | Q(role=User.ROLE_SUPERUSER)
        ).order_by('role', 'first_name', 'email')

        # get search filter from request or session
        query = self.request.GET.get("q")
        role_filter = self.request.GET.get("role_filter")
        sort_by = self.request.GET.get("sort_by")

        # store filters in session if provided in request
        if query is not None:
            self.request.session["staff_search_query"] = query
        elif "staff_search_query" in self.request.session:
            query = self.request.session["staff_search_query"]

        if role_filter is not None:
            self.request.session["staff_role_filter"] = role_filter
        elif "staff_role_filter" in self.request.session:
            role_filter = self.request.session["staff_role_filter"]

        if sort_by is not None:
            self.request.session["staff_sort_by"] = sort_by
        elif "staff_sort_by" in self.request.session:
            sort_by = self.request.session["staff_sort_by"]

        # apply filters to queryset
        if query:
            queryset = queryset.filter(
                Q(first_name__icontains=query) | 
                Q(last_name__icontains=query) | 
                Q(email__icontains=query)
            )
        
        if role_filter:
            queryset = queryset.filter(role=role_filter)

        # apply sorting
        if sort_by == "name_asc":
            queryset = queryset.order_by("first_name", "email")
        elif sort_by == "name_desc":
            queryset = queryset.order_by("-first_name", "-email")
        elif sort_by == "email_asc":
            queryset = queryset.order_by("email")
        elif sort_by == "email_desc":
            queryset = queryset.order_by("-email")
        elif sort_by == "role_asc":
            queryset = queryset.order_by("role", "first_name")
        elif sort_by == "role_desc":
            queryset = queryset.order_by("-role", "first_name")

        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # get filters from request or session
        query = self.request.GET.get(
            "q", self.request.session.get("staff_search_query", "")
        )
        role_filter = self.request.GET.get(
            "role_filter", self.request.session.get("staff_role_filter", "")
        )
        sort_by = self.request.GET.get(
            "sort_by", self.request.session.get("staff_sort_by", "")
        )

        # group staff by role for display
        all_staff = self.get_queryset()
        administrators = all_staff.filter(role=User.ROLE_SUPERUSER)
        teachers = all_staff.filter(role=User.ROLE_TEACHER)

        # add context data
        context.update({
            "administrators": administrators,
            "teachers": teachers,
            "total_administrators": administrators.count(),
            "total_teachers": teachers.count(),
            "total_staff": all_staff.count(),
            "current_query": query,
            "current_role_filter": role_filter,
            "current_sort_by": sort_by,
            "role_choices": User.ROLE_CHOICES,
        })

        return context
