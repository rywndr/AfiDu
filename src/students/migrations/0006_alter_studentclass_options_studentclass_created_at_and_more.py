# Generated by Django 5.1.7 on 2025-05-28 12:09

import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0005_alter_student_level'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='studentclass',
            options={'ordering': ['name']},
        ),
        migrations.AddField(
            model_name='studentclass',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=datetime.datetime(2025, 5, 28, 12, 8, 28, 827152, tzinfo=datetime.timezone.utc)),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='studentclass',
            name='end_time',
            field=models.TimeField(default=datetime.datetime(2025, 5, 28, 12, 10, 16, 232468, tzinfo=datetime.timezone.utc), help_text='Class end time'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='studentclass',
            name='start_time',
            field=models.TimeField(default=datetime.datetime(2025, 5, 28, 12, 9, 5, 414787, tzinfo=datetime.timezone.utc), help_text='Class start time'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='studentclass',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AlterField(
            model_name='studentclass',
            name='description',
            field=models.TextField(blank=True, default=datetime.datetime(2025, 5, 28, 12, 9, 9, 63406, tzinfo=datetime.timezone.utc)),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='studentclass',
            name='name',
            field=models.CharField(max_length=100, unique=True),
        ),
    ]
