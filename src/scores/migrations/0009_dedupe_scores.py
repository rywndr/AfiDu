"""
Collapse duplicate Score rows before a unique constraint is added.

``Score`` has had no uniqueness guarantee since migration 0003, so the live
database may contain more than one row for the same
(student, year, semester, category). The constraint added in 0010 would fail on
those rows, so merge them here first: keep the lowest pk and pull any value the
keeper is missing from its duplicates.
"""

from django.db import migrations
from django.db.models import Count


def merge_duplicate_scores(apps, schema_editor):
    Score = apps.get_model("scores", "Score")

    duplicate_keys = (
        Score.objects.values("student_id", "year", "semester", "category")
        .annotate(n=Count("id"))
        .filter(n__gt=1)
    )

    merged = removed = 0

    for key in duplicate_keys:
        group = list(
            Score.objects.filter(
                student_id=key["student_id"],
                year=key["year"],
                semester=key["semester"],
                category=key["category"],
            ).order_by("id")
        )
        keeper, duplicates = group[0], group[1:]

        changed = []
        for field in ("mid_term", "finals"):
            if getattr(keeper, field) is None:
                for dup in duplicates:
                    value = getattr(dup, field)
                    if value is not None:
                        setattr(keeper, field, value)
                        changed.append(field)
                        break

        # keep whichever exercise list carries the most populated slots
        def populated(row):
            values = row.exercise_scores or []
            return sum(1 for v in values if v)

        best = max(group, key=populated)
        if best.pk != keeper.pk and populated(best) > populated(keeper):
            keeper.exercise_scores = best.exercise_scores
            changed.append("exercise_scores")

        if changed:
            keeper.save(update_fields=list(dict.fromkeys(changed)))

        dup_ids = [d.pk for d in duplicates]
        Score.objects.filter(pk__in=dup_ids).delete()

        merged += 1
        removed += len(dup_ids)

    if merged:
        print(
            f"  merged {merged} duplicate score group(s), "
            f"deleted {removed} redundant row(s)"
        )


def noop_reverse(apps, schema_editor):
    """Merged rows cannot be recreated; reversing is intentionally a no-op."""


class Migration(migrations.Migration):

    dependencies = [
        ("scores", "0008_alter_scoreconfig_formula"),
    ]

    operations = [
        migrations.RunPython(merge_duplicate_scores, noop_reverse),
    ]
