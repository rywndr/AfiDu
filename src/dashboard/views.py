from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import render
from django.views import View
import random

from students.models import Student

# Create your views here.
class DashboardView(LoginRequiredMixin, View):
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

    greeting = random.choice(greetings)
    user_greeting = random.choice(user_greetings)

    def get(self, request, *args, **kwargs):
        student_count = Student.objects.count()
        context = {
            "greeting": self.greeting,
            "user_greeting": self.user_greeting,
            "student_count": student_count,
            "active_tab_title": "Dashboard",
            "active_tab_icon": "fa-tachometer-alt",
        }
        return render(request, "dashboard/dashboard.html", context)