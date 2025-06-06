# Generated by Django 5.1.7 on 2025-05-28 13:01

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0006_alter_studentclass_options_studentclass_created_at_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='studentclass',
            name='max_students',
            field=models.PositiveIntegerField(default=20, help_text='Maximum number of students allowed in this class'),
        ),
    ]
