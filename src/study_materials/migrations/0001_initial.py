# Generated by Django 5.1.7 on 2025-03-18 16:02

import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='StudyMaterial',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('category', models.CharField(choices=[('reading', 'Reading'), ('speaking', 'Speaking'), ('writing', 'Writing'), ('listening', 'Listening')], max_length=20)),
                ('file', models.FileField(upload_to='study_materials/', validators=[django.core.validators.FileExtensionValidator(allowed_extensions=['pdf', 'ppt', 'pptx'])])),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('edited_at', models.DateTimeField(auto_now=True)),
                ('uploaded_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
