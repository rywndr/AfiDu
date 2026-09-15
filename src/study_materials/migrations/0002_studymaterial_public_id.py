import uuid

from django.db import migrations, models


def populate_public_ids(apps, schema_editor):
    StudyMaterial = apps.get_model("study_materials", "StudyMaterial")
    for material in StudyMaterial.objects.filter(public_id__isnull=True).iterator():
        material.public_id = uuid.uuid4()
        material.save(update_fields=["public_id"])


class Migration(migrations.Migration):
    dependencies = [
        ("study_materials", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="studymaterial",
            name="public_id",
            field=models.UUIDField(
                editable=False,
                null=True,
                unique=True,
            ),
        ),
        migrations.RunPython(populate_public_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="studymaterial",
            name="public_id",
            field=models.UUIDField(
                default=uuid.uuid4,
                editable=False,
                unique=True,
            ),
        ),
    ]
