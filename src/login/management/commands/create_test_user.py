"""
Create or update a user for testing, in either app.

    # staff: signs in to the Django admin app AND the e-learning app
    python manage.py create_test_user teacher@afidu.test --role teacher --password 'Teach1234'
    python manage.py create_test_user admin@afidu.test   --role superuser --password 'Admin1234'

    # student: signs in to the e-learning app only, linked to a Student record
    python manage.py create_test_user pupil@afidu.test --role student --password 'Pupil1234' \
        --student-id 3

Re-running for an existing email resets that user's password instead of failing.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from students.models import Student

User = get_user_model()


class Command(BaseCommand):
    help = "Create or update a test user (teacher, superuser, or student)."

    def add_arguments(self, parser):
        parser.add_argument("email")
        parser.add_argument(
            "--role",
            choices=[User.ROLE_TEACHER, User.ROLE_SUPERUSER, User.ROLE_STUDENT],
            default=User.ROLE_TEACHER,
        )
        parser.add_argument("--password", required=True)
        parser.add_argument("--first-name", default="")
        parser.add_argument("--last-name", default="")
        parser.add_argument(
            "--student-id",
            type=int,
            help="Link a student role user to this Student record.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        role = options["role"]
        password = options["password"]
        student_id = options["student_id"]

        student = None
        if role == User.ROLE_STUDENT:
            if student_id:
                try:
                    student = Student.objects.get(pk=student_id)
                except Student.DoesNotExist as exc:
                    raise CommandError(f"No Student with id {student_id}.") from exc
            else:
                self.stderr.write(
                    self.style.WARNING(
                        "No --student-id given; the login will not be linked to a "
                        "Student record, so the e-learning app will not know which "
                        "class or level this user belongs to."
                    )
                )
        elif student_id:
            raise CommandError("--student-id only applies to --role student.")

        existing = User.objects.filter(email__iexact=email).first()

        if existing:
            action = "updated"
            user = existing
            if user.role != role:
                raise CommandError(
                    f"{email} already exists with role '{user.role}'. "
                    f"Refusing to change it to '{role}'."
                )
            if role == User.ROLE_STUDENT:
                user.set_student_password(password)
            else:
                user.set_password(password)
                user.save()
        else:
            action = "created"
            first_name = options["first_name"] or email.split("@")[0][:30]
            if role == User.ROLE_STUDENT:
                user = User.objects.create_student_user(
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=options["last_name"],
                )
            elif role == User.ROLE_SUPERUSER:
                user = User.objects.create_superuser(
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=options["last_name"],
                )
            else:
                user = User.objects.create_user(
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=options["last_name"],
                    role=User.ROLE_TEACHER,
                    is_staff=True,
                )

        if student is not None and student.user_id != user.pk:
            student.user = user
            student.email = email
            student.save(update_fields=["user", "email"])
            self.stdout.write(f"  linked to student #{student.pk} {student.name}")

        account = user.credential_account()
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} {role} {email}\n"
                f"  django login (internal app): "
                f"{'yes' if user.has_usable_password() else 'no (e-learning only)'}\n"
                f"  e-learning credential row:   "
                f"{'yes' if account and account.password else 'MISSING'}"
            )
        )
