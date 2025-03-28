# Generated by Django 5.1.7 on 2025-03-22 16:45

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scores', '0002_alter_score_e1_alter_score_e2_alter_score_e3_and_more'),
        ('students', '0002_alter_student_gender'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='score',
            unique_together=set(),
        ),
        migrations.AlterField(
            model_name='score',
            name='category',
            field=models.CharField(choices=[('reading', 'Reading'), ('writing', 'Writing'), ('listening', 'Listening'), ('speaking', 'Speaking')], max_length=10),
        ),
        migrations.AlterField(
            model_name='score',
            name='finals',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AlterField(
            model_name='score',
            name='mid_term',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AlterField(
            model_name='score',
            name='semester',
            field=models.CharField(choices=[('odd', 'Odd Semester'), ('even', 'Even Semester')], max_length=4),
        ),
        migrations.AlterField(
            model_name='score',
            name='student',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='students.student'),
        ),
        migrations.RemoveField(
            model_name='score',
            name='E1',
        ),
        migrations.RemoveField(
            model_name='score',
            name='E2',
        ),
        migrations.RemoveField(
            model_name='score',
            name='E3',
        ),
        migrations.RemoveField(
            model_name='score',
            name='E4',
        ),
        migrations.RemoveField(
            model_name='score',
            name='E5',
        ),
        migrations.RemoveField(
            model_name='score',
            name='E6',
        ),
        migrations.AddField(
            model_name='score',
            name='e1',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name='score',
            name='e2',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name='score',
            name='e3',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name='score',
            name='e4',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name='score',
            name='e5',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name='score',
            name='e6',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
    ]
