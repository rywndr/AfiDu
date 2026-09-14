import uuid

from django.db import migrations, models


def populate_public_ids(apps, schema_editor):
    Assignment = apps.get_model("assignments", "Assignment")
    for assignment in Assignment.objects.filter(public_id__isnull=True).iterator():
        assignment.public_id = uuid.uuid4()
        assignment.save(update_fields=["public_id"])


class Migration(migrations.Migration):
    dependencies = [
        ("assignments", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="assignment",
            name="public_id",
            field=models.UUIDField(
                editable=False,
                null=True,
                unique=True,
            ),
        ),
        migrations.RunPython(populate_public_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="assignment",
            name="public_id",
            field=models.UUIDField(
                default=uuid.uuid4,
                editable=False,
                unique=True,
            ),
        ),
    ]
