from django import template

register = template.Library()


@register.filter(name="get_item")
def get_item(dictionary, key):
    """
    Template filter to retrieve an item from a dictionary by key
    Usage: {{ dictionary|get_item:key }}
    """
    return dictionary.get(key)