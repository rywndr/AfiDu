from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Student
from .provisioning import auto_provision_suppressed, try_provision_student_login


@receiver(post_save, sender=Student, dispatch_uid="students.auto_provision_login")
def auto_provision_student_login(sender, instance, created, **kwargs):
    """
    Give every new student an e-learning login.

    Only fires on creation, skips students who already have one, and never
    raises -- a failure here must not roll back the student record. Anything
    that fails is logged and can be retried with
    ``manage.py provision_student_logins``.
    """
    if not created or auto_provision_suppressed():
        return
    if instance.user_id:
        return

    try_provision_student_login(instance)
