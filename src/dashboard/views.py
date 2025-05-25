import calendar
import random
from datetime import datetime

from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from django.views.generic import TemplateView

from payments.models import Payment, PaymentConfig
from scores.models import Score, SCORE_CATEGORIES
from students.models import Student
from study_materials.models import StudyMaterial


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
        context["current_year"] = datetime.now().year
        
        # data calcs
        context.update(self.get_recent_students_data())
        context.update(self.get_payment_data())
        context.update(self.get_score_data())
        context.update(self.get_material_data())
        context.update(self.get_pending_payments_data())
        
        return context
    
    def get_recent_students_data(self):
        """get student statistics data"""
        total_students = Student.objects.count()
        
        # students with classes vs without classes
        students_with_class = Student.objects.exclude(assigned_class__isnull=True).count()
        students_without_class = total_students - students_with_class
        
        # latest student by highest ID
        latest_student = Student.objects.order_by('-id').first()
        
        return {
            'total_active_students': total_students,
            'students_with_class': students_with_class,
            'students_without_class': students_without_class,
            'latest_student': latest_student,
        }
    
    def get_payment_data(self):
        """get payment summary data"""
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        # get all students
        total_students = Student.objects.count()
        
        # get existing payment records for current month
        current_month_payments = Payment.objects.filter(
            year=current_year, 
            month=current_month
        )
        
        # payments that are fully paid
        monthly_paid_count = current_month_payments.filter(paid=True).count()
        
        # partial/installment
        monthly_partial_count = current_month_payments.filter(
            paid=False, 
            amount_paid__gt=0
        ).count()
        
        # students who have payment records with no payment at all
        monthly_with_unpaid_records = current_month_payments.filter(
            paid=False, 
            amount_paid=0
        ).count()
        
        # students who don't have any payment record for this month at all
        students_with_payments = current_month_payments.values_list('student_id', flat=True).distinct()
        students_without_records = total_students - len(students_with_payments)
        
        # total students who haven't paid (those with unpaid records + those without records)
        monthly_unpaid_count = monthly_with_unpaid_records + students_without_records
        
        # get current month name for display
        current_month_name = calendar.month_name[current_month]
        
        return {
            'monthly_paid_count': monthly_paid_count,
            'monthly_partial_count': monthly_partial_count,
            'monthly_unpaid_count': monthly_unpaid_count,
            'current_month_name': current_month_name,
        }
    
    def get_score_data(self):
        """get highest scoring students by category"""
        current_year = datetime.now().year
        
        highest_scorers = {}
        for category_key, category_label in SCORE_CATEGORIES:
            # get highest scoring student in each category for current year
            best_scores = []
            
            for semester in ['mid', 'final']:
                scores = Score.objects.filter(
                    year=current_year,
                    semester=semester,
                    category=category_key
                )
                
                if scores.exists():
                    # find highest scoring student for this semester
                    highest_score = None
                    highest_student = None
                    highest_semester = None
                    
                    for score in scores:
                        final_score = score.final_score
                        if final_score is not None and final_score > 0:
                            if highest_score is None or final_score > highest_score:
                                highest_score = final_score
                                highest_student = score.student.name
                                highest_semester = semester.upper()
                    
                    if highest_score is not None:
                        best_scores.append({
                            'student': highest_student,
                            'score': highest_score,
                            'semester': highest_semester
                        })
            
            # get the overall highest for this category
            if best_scores:
                overall_best = max(best_scores, key=lambda x: x['score'])
                highest_scorers[category_label] = overall_best
        
        return {
            'highest_scorers': highest_scorers,
        }
    
    def get_material_data(self):
        """get study materials data"""
        # count materials by category
        material_categories = {}
        categories = StudyMaterial.objects.values('category').annotate(
            count=Count('id')
        ).order_by('category')
        
        for cat in categories:
            if cat['category']:
                material_categories[cat['category']] = cat['count']
        
        # total materials count
        total_materials = StudyMaterial.objects.count()
        
        return {
            'material_categories': material_categories,
            'total_materials': total_materials,
        }
    
    def get_pending_payments_data(self):
        """get students with unpaid payments for current month only"""
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        # get payment config for current year to check if current month is in active semester
        payment_config = PaymentConfig.get_active(current_year)
        
        # check if current month is in either semester
        mid_semester_months = list(range(
            payment_config.mid_semester_start, 
            payment_config.mid_semester_end + 1
        ))
        final_semester_months = list(range(
            payment_config.final_semester_start, 
            payment_config.final_semester_end + 1
        ))
        
        # if current month is not in any active semester, return empty
        if current_month not in mid_semester_months and current_month not in final_semester_months:
            return {
                'students_with_pending_payments': [],
                'current_month_name': calendar.month_name[current_month],
                'is_active_month': False,
            }
        
        students_with_pending = []
        
        # get students who haven't paid for current month only
        current_month_payments = Payment.objects.filter(
            year=current_year,
            month=current_month
        )
        
        # get students who have made some payment (partial or full)
        students_with_payments = set(current_month_payments.filter(
            amount_paid__gt=0
        ).values_list('student_id', flat=True))
        
        # get students who have unpaid records (amount_paid = 0)
        students_with_unpaid_records = set(current_month_payments.filter(
            amount_paid=0
        ).values_list('student_id', flat=True))
        
        # get all students
        all_students = Student.objects.all()
        
        for student in all_students:
            # if student has made any payment this month, skip them
            if student.id in students_with_payments:
                continue
                
            # if student has unpaid record or no record at all, they are pending
            if student.id in students_with_unpaid_records or student.id not in students_with_payments:
                students_with_pending.append({
                    'name': student.name,
                    'student_id': student.id,
                })
        
        # sort by name
        students_with_pending.sort(key=lambda x: x['name'])
        
        return {
            'students_with_pending_payments': students_with_pending,
            'current_month_name': calendar.month_name[current_month],
            'is_active_month': True,
        }