"""Storage selectors shared by Django model fields."""

from django.core.files.storage import storages


def study_material_storage():
    """
    Return the dedicated study-material backend.

    B2 uses unique object keys for these files, so this backend can skip the
    collision-checking HeadObject request that bucket-scoped keys may forbid.
    """
    return storages["study_materials"]
