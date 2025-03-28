from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView
import random

from students.models import Student

# Create your views here.
class DashboardView(LoginRequiredMixin, TemplateView):
    template_name = "dashboard/dashboard.html"
    
    # greetings untuk dashboard
    greetings = [
        "Welcome back!",
        "Good to see you again!",
        "How's it going?",
        "Welcome to your dashboard!",
        "Ready to be productive?",
        "Ready to tackle the day?",
        "Hope you're having a great day!",
    ]
    user_greetings = [
        "Welcome back",
        "Hello",
        "Hi there",
        "Greetings",
        "Good to see you",
    ]
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        session = self.request.session

        # set greeting once per session
        if "dashboard_greeting" not in session:
            session["dashboard_greeting"] = random.choice(self.greetings)
        if "dashboard_user_greeting" not in session:
            session["dashboard_user_greeting"] = random.choice(self.user_greetings)
        
        context["greeting"] = session["dashboard_greeting"]
        context["user_greeting"] = session["dashboard_user_greeting"]
        context["student_count"] = Student.objects.count()
        context["active_tab_title"] = "Dashboard"
        context["active_tab_icon"] = "fa-tachometer-alt"
        return context