import threading

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend

# buat thread-local storage tuk save password reset link
_local = threading.local()


class DisplayLinkEmailBackend(BaseEmailBackend):
    """
    backend untuk menangkap reset link lalu simpan di thread-local storage.
    """

    def send_messages(self, email_messages):
        """
        ambil reset link dari email lalu di simpan
        """
        if not email_messages:
            return 0

        count = 0
        for message in email_messages:
            # ambil reset link dari email body
            body = message.body

            # logic basic untuk nyari reset link dari email body
            try:
                link_start = body.find("http")
                if link_start != -1:
                    link_end = body.find("\n", link_start)
                    if (
                        link_end == -1
                    ):  # jika tidak ada newline lanjut sampai akhir body
                        link_end = len(body)

                    reset_link = body[link_start:link_end].strip()

                    # setelah dapat link nya simpan di thread-local storage
                    _local.reset_link = reset_link
                    _local.reset_email = message.to[0]

                    count += 1
            except:
                # if error fallback to console
                if settings.DEBUG:
                    print("Email to:", message.to)
                    print("Subject:", message.subject)
                    print("Body:", message.body)

        return count


def get_reset_link():
    """
    ambil reset link dari thread-local storage.
    """
    return getattr(_local, "reset_link", None)


def get_reset_email():
    """
    ambil email address yang dipake untuk reset.
    """
    return getattr(_local, "reset_email", None)


def clear_reset_link():
    """
    clear reset link dari thread-local storage.
    """
    if hasattr(_local, "reset_link"):
        del _local.reset_link
    if hasattr(_local, "reset_email"):
        del _local.reset_email
