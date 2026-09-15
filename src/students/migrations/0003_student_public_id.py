from django.db import migrations, models

from students.identifiers import generate_student_public_id


def populate_public_ids(apps, schema_editor):
    Student = apps.get_model("students", "Student")
    for student in Student.objects.filter(public_id__isnull=True).iterator():
        student.public_id = generate_student_public_id()
        student.save(update_fields=["public_id"])


class Migration(migrations.Migration):
    dependencies = [
        ("students", "0002_studentclass_slug"),
    ]

    operations = [
        migrations.AddField(
            model_name="student",
            name="public_id",
            field=models.CharField(
                editable=False,
                max_length=22,
                null=True,
                unique=True,
            ),
        ),
        migrations.RunPython(populate_public_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="student",
            name="public_id",
            field=models.CharField(
                default=generate_student_public_id,
                editable=False,
                max_length=22,
                unique=True,
            ),
        ),
    ]
