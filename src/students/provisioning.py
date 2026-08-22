"""
Student e-learning login provisioning.

Every student gets an account for the Next.js app. The email is derived from
their name and the password starts as the shared ``STUDENT_DEFAULT_PASSWORD``.

Shared by the ``post_save`` signal in :mod:`students.signals` and the
``provision_student_logins`` management command so both build addresses the same
way.
"""

import logging
import re
import unicodedata
from contextlib import contextmanager
from threading import local

from django.conf import settings
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

_state = local()


@contextmanager
def suppress_auto_provision():
    """
    Temporarily stop the ``post_save`` signal from creating logins.

    Useful for bulk imports and for tests that need a student without an
    account. Provisioning can still be done explicitly inside the block.
    """
    previous = getattr(_state, "suppressed", False)
    _state.suppressed = True
    try:
        yield
    finally:
        _state.suppressed = previous


def auto_provision_suppressed():
    return getattr(_state, "suppressed", False)


def email_domain():
    return getattr(settings, "STUDENT_LOGIN_EMAIL_DOMAIN", "afidu.local")


def default_password():
    return getattr(settings, "STUDENT_DEFAULT_PASSWORD", "1234")


def name_to_local_part(name):
    """
    "Ary Agus Pranata" -> "ary.agus.pranata"

    Accents are folded and anything that is not a letter or digit becomes a dot,
    so the result is always a valid email local part.
    """
    folded = (
        unicodedata.normalize("NFKD", name or "")
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    slug = re.sub(r"[^a-zA-Z0-9]+", ".", folded).strip(".").lower()
    slug = re.sub(r"\.{2,}", ".", slug)
    return slug[:48] or "student"


def build_student_email(student, domain=None, taken=None):
    """
    The address to provision for ``student``.

    Uses the email already on the record when there is one. Otherwise derives
    one from the name, appending the student's id if that address is already
    used by another account (or is in ``taken``, for de-duplicating within a
    single batch).
    """
    existing = (getattr(student, "email", "") or "").strip().lower()
    if existing:
        return existing

    from login.models import CustomUser

    domain = domain or email_domain()
    taken = taken if taken is not None else set()

    local_part = name_to_local_part(student.name)
    candidate = f"{local_part}@{domain}"

    def is_free(address):
        if address in taken:
            return False
        return not CustomUser.objects.filter(email__iexact=address).exists()

    if is_free(candidate):
        return candidate

    # disambiguate with the student id, which is stable and unique
    candidate = f"{local_part}.{student.pk}@{domain}"
    if is_free(candidate):
        return candidate

    # extremely unlikely; keep counting rather than raise
    suffix = 2
    while True:
        candidate = f"{local_part}.{student.pk}.{suffix}@{domain}"
        if is_free(candidate):
            return candidate
        suffix += 1


def provision_student_login(student, email=None, password=None, taken=None):
    """
    Give ``student`` an e-learning account, or rotate the password of the one
    they already have. Returns the ``CustomUser``.
    """
    email = email or build_student_email(student, taken=taken)
    password = password or default_password()
    return student.provision_login(email=email, password=password)


def try_provision_student_login(student, **kwargs):
    """
    Same as :func:`provision_student_login` but never raises.

    Used from the signal: a student record must still save even if their login
    cannot be created (a clashing email, say). Returns the user or ``None``, and
    logs the reason on failure so it can be retried with
    ``manage.py provision_student_logins``.
    """
    try:
        return provision_student_login(student, **kwargs)
    except ValidationError as exc:
        logger.warning(
            "Could not provision an e-learning login for student %s (%s): %s",
            student.pk,
            student.name,
            "; ".join(exc.messages),
        )
    except Exception:
        logger.exception(
            "Unexpected error provisioning an e-learning login for student %s",
            student.pk,
        )
    return None
