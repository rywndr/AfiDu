"""
Give pre-existing users a created_at / updated_at value.

Both columns are nullable so the schema migration could run without a default;
better-auth expects them populated, so fill them in with the current time.
"""

from django.db import migrations
from django.utils import timezone


def backfill_timestamps(apps, schema_editor):
    CustomUser = apps.get_model("login", "CustomUser")
    now = timezone.now()
    updated = CustomUser.objects.filter(created_at__isnull=True).update(
        created_at=now, updated_at=now
    )
    if updated:
        print(f"  backfilled timestamps for {updated} user(s)")


def noop_reverse(apps, schema_editor):
    """Nothing to undo; the columns are dropped by the schema migration."""


class Migration(migrations.Migration):

    dependencies = [
        ("login", "0003_customuser_created_at_customuser_email_verified_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_timestamps, noop_reverse),
    ]
