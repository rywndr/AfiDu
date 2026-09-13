import base64
import uuid


def generate_student_public_id():
    """Return a compact, URL-safe encoding of a random UUID4."""
    return base64.urlsafe_b64encode(uuid.uuid4().bytes).rstrip(b"=").decode("ascii")
