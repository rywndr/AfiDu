import calendar
import random
from datetime import datetime

from django.contrib.auth import get_user_model
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Count, Sum, Avg, Q, Max, F
from django.utils import timezone
from django.views.generic import TemplateView

from payments.models import Payment, PaymentConfig
from scores.models import Score, SCORE_CATEGORIES
from students.models import Student
from study_materials.models import StudyMaterial

User = get_user_model()


class DashboardView(LoginRequiredMixin, TemplateView):
    template_name = "dashboard/dashboard.html"
    
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

        if "dashboard_greeting" not in session:
            session["dashboard_greeting"] = random.choice(self.greetings)
        if "dashboard_user_greeting" not in session:
            session["dashboard_user_greeting"] = random.choice(self.user_greetings)
        
        context["greeting"] = session["dashboard_greeting"]
        context["user_greeting"] = session["dashboard_user_greeting"]
        context["active_tab_title"] = "Dashboard"
        context["active_tab_icon"] = "fa-tachometer-alt"
        context["current_year"] = datetime.now().year
        
        # Get all data in single queries
        context.update(self.get_all_dashboard_data())
        
        return context
    
    def get_all_dashboard_data(self):
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        # Single query for student statistics
        student_stats = Student.objects.aggregate(
            total_students=Count('id'),
            students_with_class=Count('id', filter=Q(assigned_class__isnull=False)),
        )
        
        # Get latest student with single query
        latest_student = Student.objects.select_related('assigned_class').order_by('-id').values(
            'id', 'name', 'assigned_class__name'
        ).first()
        
        # Single query for payment statistics
        payment_stats = Payment.objects.filter(
            year=current_year, 
            month=current_month
        ).aggregate(
            paid_count=Count('id', filter=Q(paid=True)),
            partial_count=Count('id', filter=Q(paid=False, amount_paid__gt=0)),
            unpaid_records_count=Count('id', filter=Q(paid=False, amount_paid=0)),
            unique_students_with_payments=Count('student_id', distinct=True)
        )
        
        # Calculate students without payment records
        students_without_records = student_stats['total_students'] - payment_stats['unique_students_with_payments']
        monthly_unpaid_count = payment_stats['unpaid_records_count'] + students_without_records
        
        # Get highest scores using Score model properties
        highest_scorers = {}
        for category_key, category_label in SCORE_CATEGORIES:
            # Get all scores for this category and year, then find the highest using Python
            scores = Score.objects.filter(
                year=current_year,
                category=category_key
            ).select_related('student')
            
            best_score = None
            best_student = None
            best_semester = None
            
            for score in scores:
                score_value = score.final_score  # This uses the @property method
                if score_value is not None and score_value > 0:
                    if best_score is None or score_value > best_score:
                        best_score = score_value
                        best_student = score.student.name
                        best_semester = score.semester.upper()
            
            if best_score is not None:
                highest_scorers[category_label] = {
                    'student': best_student,
                    'score': best_score,
                    'semester': best_semester
                }
        
        # Single query for material categories
        material_stats = StudyMaterial.objects.values('category').annotate(
            count=Count('id')
        ).aggregate(
            total_materials=Sum('count'),
            categories_data=Count('category', filter=Q(category__isnull=False))
        )
        
        # Get material categories in one query
        material_categories = dict(
            StudyMaterial.objects.exclude(category__isnull=True)
            .exclude(category='')
            .values_list('category')
            .annotate(count=Count('id'))
            .values_list('category', 'count')
        )
        
        # Optimized pending payments data
        pending_data = self.get_optimized_pending_payments_data(current_year, current_month, student_stats['total_students'])
        
        # staff statistics (only for superusers)
        staff_stats = {}
        if hasattr(self.request, 'user') and self.request.user.is_superuser:
            staff_stats = User.objects.aggregate(
                total_staff=Count('id', filter=Q(role__in=[User.ROLE_TEACHER, User.ROLE_SUPERUSER])),
                total_administrators=Count('id', filter=Q(role=User.ROLE_SUPERUSER)),
                total_teachers=Count('id', filter=Q(role=User.ROLE_TEACHER)),
            )
        
        return {
            'total_active_students': student_stats['total_students'],
            'students_with_class': student_stats['students_with_class'],
            'students_without_class': student_stats['total_students'] - student_stats['students_with_class'],
            'latest_student': {
                'name': latest_student['name'] if latest_student else None,
                'assigned_class': {'name': latest_student['assigned_class__name']} if latest_student and latest_student['assigned_class__name'] else None
            } if latest_student else None,
            'monthly_paid_count': payment_stats['paid_count'],
            'monthly_partial_count': payment_stats['partial_count'],
            'monthly_unpaid_count': monthly_unpaid_count,
            'current_month_name': calendar.month_name[current_month],
            'highest_scorers': highest_scorers,
            'material_categories': material_categories,
            'total_materials': material_stats['total_materials'] or 0,
            'student_count': student_stats['total_students'],
            **pending_data,
            **staff_stats
        }
    
    def get_optimized_pending_payments_data(self, current_year, current_month, total_students):
        try:
            payment_config = PaymentConfig.objects.filter(year=current_year).first()
            if not payment_config:
                payment_config = PaymentConfig.objects.filter(year__isnull=True).first()
                if not payment_config:
                    return {
                        'students_with_pending_payments': [],
                        'current_month_name': calendar.month_name[current_month],
                        'is_active_month': False,
                    }
        except Exception:
            return {
                'students_with_pending_payments': [],
                'current_month_name': calendar.month_name[current_month],
                'is_active_month': False,
            }
        
        mid_semester_months = list(range(
            payment_config.mid_semester_start, 
            payment_config.mid_semester_end + 1
        ))
        final_semester_months = list(range(
            payment_config.final_semester_start, 
            payment_config.final_semester_end + 1
        ))
        
        if current_month not in mid_semester_months and current_month not in final_semester_months:
            return {
                'students_with_pending_payments': [],
                'current_month_name': calendar.month_name[current_month],
                'is_active_month': False,
            }
        
        # Get students who have made payments this month in single query
        students_with_payments = set(
            Payment.objects.filter(
                year=current_year,
                month=current_month,
                amount_paid__gt=0
            ).values_list('student_id', flat=True)
        )
        
        # Get all students without payments in single query - limit to 10 for performance
        students_pending = Student.objects.exclude(
            id__in=students_with_payments
        ).values('id', 'name').order_by('name')[:10]
        
        students_with_pending = [
            {'name': student['name'], 'student_id': student['id']}
            for student in students_pending
        ]
        
        return {
            'students_with_pending_payments': students_with_pending,
            'current_month_name': calendar.month_name[current_month],
            'is_active_month': True,
        }