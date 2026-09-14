import uuid

from django.db import migrations, models


def populate_public_ids(apps, schema_editor):
    Submission = apps.get_model("assignments", "Submission")
    for submission in Submission.objects.filter(public_id__isnull=True).iterator():
        submission.public_id = uuid.uuid4()
        submission.save(update_fields=["public_id"])


class Migration(migrations.Migration):
    dependencies = [
        ("assignments", "0003_assignment_public_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="submission",
            name="public_id",
            field=models.UUIDField(
                editable=False,
                null=True,
                unique=True,
            ),
        ),
        migrations.RunPython(populate_public_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="submission",
            name="public_id",
            field=models.UUIDField(
                default=uuid.uuid4,
                editable=False,
                unique=True,
            ),
        ),
    ]
