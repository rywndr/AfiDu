DEFAULT_PAGE_SIZE = 15
PAGE_SIZE_CHOICES = (15, 25, 50)


def normalize_page_size(value):
    """Return a supported page size, falling back to the project default."""
    try:
        page_size = int(value)
    except (TypeError, ValueError):
        return DEFAULT_PAGE_SIZE
    return page_size if page_size in PAGE_SIZE_CHOICES else DEFAULT_PAGE_SIZE
