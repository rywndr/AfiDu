import {
  BookOpen,
  CalendarClock,
  ListChecks,
  Repeat,
  Users,
} from 'lucide-react';

import { Fact, FactGrid, FactNote, FactValue, MetaItem } from '@/components/dashboard/facts';
import { SurfaceCard } from '@/components/dashboard/surfaces';
import { CardContent } from '@/components/ui/card';
import { formatDateTime, formatScore, pluralize } from '@/lib/format';
import type { AssignmentSummary } from '@/lib/assignments';

/** The window, marks and progress of an assignment, above its submissions. */
export function AssignmentFacts({ item }: { item: AssignmentSummary }) {
  const points = formatScore(item.maxPoints);

  return (
    <SurfaceCard>
      <CardContent className="p-4 sm:p-5">
        <FactGrid>
          <Fact label="Focus">
            <FactValue className="font-semibold text-ink-strong capitalize">
              {item.category}
            </FactValue>
            <FactNote className="capitalize">
              {item.level} · {item.status}
            </FactNote>
          </Fact>

          <Fact label="Window">
            <FactValue>
              <MetaItem icon={CalendarClock} align="start">
                <span>
                  {item.dueAt ? `Due ${formatDateTime(item.dueAt)}` : 'No due date'}
                  {item.openAt ? (
                    <span className="block text-xs text-ink-subtle">
                      Opens {formatDateTime(item.openAt)}
                    </span>
                  ) : null}
                  {item.allowLate ? (
                    <span className="block text-xs text-ink-subtle">
                      Late submissions accepted
                    </span>
                  ) : null}
                </span>
              </MetaItem>
            </FactValue>
          </Fact>

          <Fact label="Marks">
            <FactValue>
              <MetaItem icon={ListChecks}>
                {points} points over {pluralize(item.questionCount, 'question')}
              </MetaItem>
            </FactValue>
            <FactNote className="mt-1">
              <MetaItem icon={Repeat}>
                {pluralize(item.maxAttempts, 'attempt')}
                {item.timeLimitMinutes ? ` · ${item.timeLimitMinutes} min limit` : ''}
                {item.autoGrade ? ' · auto-marked' : ''}
              </MetaItem>
            </FactNote>
          </Fact>

          <Fact label="Progress">
            <FactValue>
              <MetaItem icon={Users}>
                {pluralize(item.submissionCount, 'submission')}
              </MetaItem>
            </FactValue>
            <FactNote className="mt-1">
              {item.awaitingGradingCount} to mark · {item.gradedCount} marked
            </FactNote>
          </Fact>

          {item.materialId && item.materialTitle ? (
            <Fact label="Reference module" className="sm:col-span-2 lg:col-span-4">
              <FactValue>
                <MetaItem icon={BookOpen}>
                  <span className="truncate">{item.materialTitle}</span>
                </MetaItem>
              </FactValue>
            </Fact>
          ) : null}
        </FactGrid>

        {item.description ? (
          <p className="mt-4 border-t border-shell-divider pt-4 text-sm whitespace-pre-line text-ink-muted">
            {item.description}
          </p>
        ) : null}
      </CardContent>
    </SurfaceCard>
  );
}
