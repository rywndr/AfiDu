from django import template

register = template.Library()

@register.simple_tag(takes_context=True)
def active_link(context, namespace):
    try:
        if context.request.resolver_match.app_name == namespace:
            return "bg-[#ffdcd3] border-r-4 border-[#ff4f25] text-red-600"
    except AttributeError:
        return ""
    return "border-l-4 border-transparent text-gray-700"
