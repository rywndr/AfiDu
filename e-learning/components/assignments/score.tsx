/** How a submission's marks are shown, on the list and on the detail page. */
import { formatScore } from '@/lib/format';
import { cn } from '@/lib/utils';

export function ScoreTotal({
  score,
  maxPoints,
  className,
}: {
  score: string | null;
  maxPoints: string;
  className?: string;
}) {
  return (
    <span className={cn('block text-lg font-bold text-ink-strong', className)}>
      {score === null ? '-' : formatScore(score)}
      <span className="text-sm font-medium text-ink-subtle">
        {' / '}
        {formatScore(maxPoints)}
      </span>
    </span>
  );
}

/**
 * `auto 8 · manual 4`, naming only the halves that exist. `autoFallback` is the
 * wording for a submission that was never auto-marked; without it that half is
 * left out entirely.
 */
export function scoreBreakdown(
  autoScore: string | null,
  manualScore: string | null,
  autoFallback?: string,
): string {
  const parts: string[] = [];
  if (autoScore !== null) parts.push(`auto ${formatScore(autoScore)}`);
  else if (autoFallback) parts.push(autoFallback);
  if (manualScore !== null) parts.push(`manual ${formatScore(manualScore)}`);
  return parts.join(' · ');
}
