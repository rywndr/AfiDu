import logging

from botocore.exceptions import BotoCoreError, ClientError
from core.mixins import StaffRequiredMixin
from django.contrib import messages
from django.db.models import Q
from django.http import JsonResponse
from django.urls import reverse_lazy
from django.views.generic import CreateView, DeleteView, DetailView, ListView, UpdateView

from .forms import StudyMaterialForm
from .models import StudyMaterial

logger = logging.getLogger(__name__)


def is_progress_upload(request):
    return request.headers.get("x-requested-with") == "XMLHttpRequest"


def render_storage_error(view, form):
    """Return a useful form error instead of exposing a boto traceback."""
    logger.exception("Study material storage operation failed")
    message = (
        "Backblaze B2 rejected the upload. Verify that B2_KEY_ID and "
        "B2_APPLICATION_KEY belong to a standard (non-master) application key "
        "with access to this bucket."
    )
    form.add_error(None, message)
    messages.error(view.request, message)
    return view.render_to_response(view.get_context_data(form=form))


# Create your views here.
class StudyMaterialContextMixin:
    def get_study_material_context(self):
        return {
            "active_tab_title": "Study Materials",
            "active_tab_icon": "fa-book",
            "level_choices": StudyMaterial._meta.get_field("level").choices,
            "category_choices": StudyMaterial._meta.get_field("category").choices,
            "material_type_choices": StudyMaterial.TYPE_CHOICES,
        }

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context.update(self.get_study_material_context())
        return context

class StudyMaterialListView(StaffRequiredMixin, StudyMaterialContextMixin, ListView):
    model = StudyMaterial
    template_name = "study_materials/list.html"
    context_object_name = "materials"

    def get_queryset(self):
        queryset = (
            super()
            .get_queryset()
            .select_related("uploaded_by", "student_class")
            .prefetch_related("assignments")
        )
        
        # Get filters from request or session
        q = self.request.GET.get("q")
        category_filter = self.request.GET.get("category_filter")
        level_filter = self.request.GET.get("level_filter")
        material_type_filter = self.request.GET.get("material_type_filter")
        sort_by = self.request.GET.get("sort_by")
        
        # Store filters in session if provided in request
        if q is not None:
            self.request.session["materials_search_query"] = q
        elif "materials_search_query" in self.request.session:
            q = self.request.session["materials_search_query"]
            
        if category_filter is not None:
            self.request.session["materials_category_filter"] = category_filter
        elif "materials_category_filter" in self.request.session:
            category_filter = self.request.session["materials_category_filter"]
            
        if level_filter is not None:
            self.request.session["materials_level_filter"] = level_filter
        elif "materials_level_filter" in self.request.session:
            level_filter = self.request.session["materials_level_filter"]

        if material_type_filter is not None:
            self.request.session["materials_type_filter"] = material_type_filter
        elif "materials_type_filter" in self.request.session:
            material_type_filter = self.request.session["materials_type_filter"]
            
        if sort_by is not None:
            self.request.session["materials_sort_by"] = sort_by
        elif "materials_sort_by" in self.request.session:
            sort_by = self.request.session["materials_sort_by"]
        
        # Apply filters
        if q:
            queryset = queryset.filter(
                Q(title__icontains=q)
                | Q(description__icontains=q)
                | Q(content__icontains=q)
                | Q(original_filename__icontains=q)
                | Q(assignments__title__icontains=q)
            ).distinct()
        if category_filter:
            queryset = queryset.filter(category=category_filter)
        if level_filter:
            queryset = queryset.filter(level=level_filter)
        if material_type_filter:
            queryset = queryset.filter(material_type=material_type_filter)
            
        # Apply sorting
        if sort_by == "title_asc":
            queryset = queryset.order_by("title")
        elif sort_by == "title_desc":
            queryset = queryset.order_by("-title")
            
        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Get search/filter values from request or session
        q = self.request.GET.get("q", self.request.session.get("materials_search_query", ""))
        category_filter = self.request.GET.get("category_filter", self.request.session.get("materials_category_filter", ""))
        level_filter = self.request.GET.get("level_filter", self.request.session.get("materials_level_filter", ""))
        material_type_filter = self.request.GET.get("material_type_filter", self.request.session.get("materials_type_filter", ""))
        sort_by = self.request.GET.get("sort_by", self.request.session.get("materials_sort_by", ""))
        
        # Get categories and levels that exist in database
        categories = StudyMaterial.objects.values_list("category", flat=True).distinct()
        levels = StudyMaterial.objects.values_list("level", flat=True).distinct()
        
        context["categories"] = categories
        context["levels"] = levels
        context["q"] = q
        context["category_filter"] = category_filter
        context["level_filter"] = level_filter
        context["material_type_filter"] = material_type_filter
        context["current_sort_by"] = sort_by
        return context


class StudyMaterialDetailView(
    StaffRequiredMixin, StudyMaterialContextMixin, DetailView
):
    model = StudyMaterial
    template_name = "study_materials/detail.html"
    context_object_name = "material"

    def get_queryset(self):
        return super().get_queryset().select_related(
            "uploaded_by", "student_class"
        ).prefetch_related("assignments")

class StudyMaterialCreateView(StaffRequiredMixin, StudyMaterialContextMixin, CreateView):
    model = StudyMaterial
    form_class = StudyMaterialForm
    template_name = "study_materials/upload.html"
    success_url = reverse_lazy("study_materials:list")

    def form_valid(self, form):
        form.instance.uploaded_by = self.request.user
        try:
            response = super().form_valid(form)
        except (BotoCoreError, ClientError):
            return render_storage_error(self, form)
        messages.success(self.request, "Study material uploaded successfully.")
        if is_progress_upload(self.request):
            return JsonResponse({"redirect_url": str(self.get_success_url())}, status=201)
        return response

    def form_invalid(self, form):
        messages.error(self.request, "Failed to upload study material. Please check the form and try again.")
        return super().form_invalid(form)

class StudyMaterialUpdateView(StaffRequiredMixin, StudyMaterialContextMixin, UpdateView):
    model = StudyMaterial
    form_class = StudyMaterialForm
    template_name = "study_materials/edit.html"
    success_url = reverse_lazy("study_materials:list")

    def get_form(self, form_class=None):
        form = super().get_form(form_class)
        form.fields["file"].help_text = (
            "Leave empty to keep the current file, or upload a replacement. "
            + form.fields["file"].help_text
        )
        return form

    def form_valid(self, form):
        try:
            response = super().form_valid(form)
        except (BotoCoreError, ClientError):
            return render_storage_error(self, form)
        messages.success(self.request, "Study material updated successfully.")
        if is_progress_upload(self.request):
            return JsonResponse({"redirect_url": str(self.get_success_url())}, status=200)
        return response
    
    def form_invalid(self, form):
        messages.error(self.request, "Failed to update study material.")
        return super().form_invalid(form)

class StudyMaterialDeleteView(StaffRequiredMixin, StudyMaterialContextMixin, DeleteView):
    model = StudyMaterial
    template_name = "study_materials/confirm_delete.html"
    success_url = reverse_lazy("study_materials:list")

    def form_valid(self, form):
        messages.success(self.request, "Study material deleted successfully.")
        return super().form_valid(form)
    
    def form_invalid(self, form):
        messages.error(self.request, "Failed to delete study material.")
        return super().form_invalid(form)
