"""
Provision e-learning logins for students who do not have one yet.

New students get an account automatically (see ``students/signals.py``), so this
is for backfilling records created before that existed, and for retrying any
student whose automatic provisioning failed.

    python manage.py provision_student_logins --dry-run
    python manage.py provision_student_logins
    python manage.py provision_student_logins --student-id 42 --password 'S3cret!'
    python manage.py provision_student_logins --reset-existing
"""

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from students.models import Student
from students.provisioning import (
    build_student_email,
    default_password,
    email_domain,
    provision_student_login,
)


class Command(BaseCommand):
    help = "Create e-learning logins (CustomUser + credential account) for students."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would happen without writing anything.",
        )
        parser.add_argument(
            "--student-id",
            type=int,
            action="append",
            dest="student_ids",
            help="Limit to this student id. Repeatable.",
        )
        parser.add_argument(
            "--email-domain",
            help=(
                "Domain for generated emails. "
                f"Defaults to STUDENT_LOGIN_EMAIL_DOMAIN ({email_domain()})."
            ),
        )
        parser.add_argument(
            "--password",
            help=(
                "Password to set. Defaults to STUDENT_DEFAULT_PASSWORD. "
                "Use --random-password for a unique one per student instead."
            ),
        )
        parser.add_argument(
            "--random-password",
            action="store_true",
            help="Generate and print a unique password per student.",
        )
        parser.add_argument(
            "--reset-existing",
            action="store_true",
            help=(
                "Also reset the password of students who already have a login. "
                "Their email is left alone."
            ),
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        student_ids = options["student_ids"]
        domain = (options["email_domain"] or "").lstrip("@").strip() or email_domain()
        fixed_password = options["password"]
        random_password = options["random_password"]
        reset_existing = options["reset_existing"]

        if fixed_password and random_password:
            raise CommandError("Use either --password or --random-password, not both.")

        qs = Student.objects.all().order_by("pk")
        if not reset_existing:
            qs = qs.filter(user__isnull=True)
        if student_ids:
            qs = qs.filter(pk__in=student_ids)
            missing = set(student_ids) - set(qs.values_list("pk", flat=True))
            if missing:
                self.stderr.write(
                    self.style.WARNING(
                        f"Skipping ids not matched: {sorted(missing)} "
                        f"(already provisioned? use --reset-existing)"
                    )
                )

        total = qs.count()
        if not total:
            self.stdout.write("No students need provisioning.")
            return

        done = failed = 0
        taken = set()

        for student in qs:
            if random_password:
                from secrets import choice
                from string import ascii_letters, digits

                alphabet = ascii_letters + digits
                password = "".join(choice(alphabet) for _ in range(14))
            else:
                password = fixed_password or default_password()

            email = build_student_email(student, domain=domain, taken=taken)
            taken.add(email)

            shown = f"  password: {password}" if random_password else ""

            if dry_run:
                verb = "would reset" if student.user_id else "would provision"
                self.stdout.write(f"  {verb} #{student.pk} {student.name} -> {email}")
                done += 1
                continue

            try:
                with transaction.atomic():
                    provision_student_login(
                        student, email=email, password=password, taken=taken
                    )
            except ValidationError as exc:
                self.stderr.write(
                    self.style.ERROR(
                        f"  fail  #{student.pk} {student.name}: "
                        f"{'; '.join(exc.messages)}"
                    )
                )
                failed += 1
                continue

            done += 1
            self.stdout.write(f"  ok    #{student.pk} {student.name} -> {email}{shown}")

        verb = "would provision" if dry_run else "provisioned"
        summary = f"{verb} {done}, failed {failed} (of {total})"
        style = self.style.WARNING if failed else self.style.SUCCESS
        self.stdout.write(style(summary))

        if not dry_run and not random_password and not fixed_password:
            self.stdout.write(
                self.style.WARNING(
                    f"All of these share the default password "
                    f"({default_password()!r}). Have students change it after "
                    f"their first sign-in."
                )
            )

        if failed and not dry_run:
            raise CommandError(f"{failed} student(s) could not be provisioned.")
