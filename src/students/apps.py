from django.apps import AppConfig


class StudentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'students'

    def ready(self):
        # registers the post_save hook that provisions e-learning logins
        from . import signals  # noqa: F401
