# Generated by Django 5.1.7 on 2025-04-14 13:20

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0003_studentclass_alter_student_assigned_class'),
    ]

    operations = [
        migrations.AddField(
            model_name='student',
            name='level',
            field=models.CharField(choices=[('Beginner 1', 'Beginner 1'), ('Beginner 2', 'Beginner 2'), ('Elementary 1', 'Elementary 1'), ('Elementary 2', 'Elementary 2'), ('Elementary 3', 'Elementary 3'), ('Junior 1', 'Junior 1'), ('Junior 2', 'Junior 2'), ('Junior 3', 'Junior 3'), ('Senior 1', 'Senior 1'), ('Senior 2', 'Senior 2'), ('Senior 3', 'Senior 3')], default='Beginner 1', max_length=20),
            preserve_default=False,
        ),
    ]
