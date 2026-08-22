"""
Mirror existing staff password hashes into the credential accounts that the
e-learning app reads.

Staff created before ``AuthAccount`` existed have a hash on ``CustomUser`` but
no credential row, so they cannot sign in to the e-learning app. This copies the
hash across -- no password reset needed, since both sides use the same
``pbkdf2_sha256`` format.

    python manage.py sync_credential_accounts --dry-run
    python manage.py sync_credential_accounts
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()


class Command(BaseCommand):
    help = "Copy staff Django password hashes into their e-learning credential accounts."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Rewrite credential rows that already have a password.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        force = options["force"]

        staff = User.objects.exclude(role=User.ROLE_STUDENT).order_by("pk")

        synced = skipped = unusable = 0

        for user in staff:
            if not user.has_usable_password():
                self.stdout.write(
                    f"  skip  {user.email}: no usable Django password"
                )
                unusable += 1
                continue

            account = user.credential_account()
            if account and account.password and not force:
                if account.password == user.password:
                    skipped += 1
                    continue
                # hash on the account is stale relative to Django
                reason = "stale hash"
            else:
                reason = "missing credential row" if not account else "empty password"

            if dry_run:
                self.stdout.write(f"  would sync {user.email} ({reason})")
            else:
                user.sync_credential_account()
                self.stdout.write(f"  synced {user.email} ({reason})")
            synced += 1

        verb = "would sync" if dry_run else "synced"
        self.stdout.write(
            self.style.SUCCESS(
                f"{verb} {synced}, already current {skipped}, "
                f"no usable password {unusable}"
            )
        )
