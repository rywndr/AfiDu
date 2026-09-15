from django.db import migrations, models
from django.utils.text import slugify


def populate_class_slugs(apps, schema_editor):
    StudentClass = apps.get_model("students", "StudentClass")
    used = set()

    for student_class in StudentClass.objects.order_by("pk").iterator():
        base = slugify(student_class.name)[:110] or "class"
        slug = base
        suffix = 2
        while slug in used:
            slug = f"{base}-{suffix}"
            suffix += 1
        used.add(slug)
        student_class.slug = slug
        student_class.save(update_fields=["slug"])


class Migration(migrations.Migration):
    dependencies = [
        ("students", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentclass",
            name="slug",
            field=models.SlugField(
                blank=True,
                editable=False,
                max_length=120,
                null=True,
                unique=True,
            ),
        ),
        migrations.RunPython(populate_class_slugs, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="studentclass",
            name="slug",
            field=models.SlugField(
                blank=True,
                editable=False,
                max_length=120,
                unique=True,
            ),
        ),
    ]
