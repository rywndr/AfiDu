"""
Move exercise scores out of the ``legacy_exercise_scores`` JSON list and into
one ``ScoreEntry`` row per slot.

The JSON column is deliberately left in place so this is reversible.
"""

from decimal import Decimal, InvalidOperation

from django.db import migrations

# matches ScoreEntry.points -> DecimalField(max_digits=5, decimal_places=2)
MAX_POINTS = Decimal("100.00")
CENTS = Decimal("0.01")


def to_decimal(value):
    if value is None:
        return None
    try:
        points = Decimal(str(value)).quantize(CENTS)
    except (InvalidOperation, ValueError, TypeError):
        return None
    if points < 0:
        return Decimal("0.00")
    if points > MAX_POINTS:
        # the column only holds 5 digits; clamp rather than fail the migration
        return MAX_POINTS
    return points


def forwards(apps, schema_editor):
    Score = apps.get_model("scores", "Score")
    ScoreEntry = apps.get_model("scores", "ScoreEntry")

    batch = []
    scores = 0

    for score_id, legacy in Score.objects.values_list(
        "id", "legacy_exercise_scores"
    ).iterator(chunk_size=1000):
        if not legacy:
            continue
        scores += 1
        for index, raw in enumerate(legacy, start=1):
            batch.append(
                ScoreEntry(
                    score_id=score_id,
                    slot=index,
                    points=to_decimal(raw),
                    source="manual",
                )
            )
        if len(batch) >= 2000:
            ScoreEntry.objects.bulk_create(batch, batch_size=1000)
            batch = []

    if batch:
        ScoreEntry.objects.bulk_create(batch, batch_size=1000)

    if scores:
        print(f"  migrated exercise scores for {scores} score row(s)")


def backwards(apps, schema_editor):
    """
    Rebuild the JSON list from the entries, so edits made after the forward
    migration are not lost, then drop the entries.
    """
    Score = apps.get_model("scores", "Score")
    ScoreEntry = apps.get_model("scores", "ScoreEntry")

    by_score = {}
    for score_id, slot, points in ScoreEntry.objects.order_by(
        "score_id", "slot"
    ).values_list("score_id", "slot", "points"):
        by_score.setdefault(score_id, []).append(
            0 if points is None else float(points)
        )

    to_update = []
    for score in Score.objects.filter(pk__in=by_score.keys()).only(
        "id", "legacy_exercise_scores"
    ):
        score.legacy_exercise_scores = by_score[score.pk]
        to_update.append(score)

    if to_update:
        Score.objects.bulk_update(
            to_update, ["legacy_exercise_scores"], batch_size=1000
        )

    ScoreEntry.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("scores", "0010_scoreentry_and_more"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
