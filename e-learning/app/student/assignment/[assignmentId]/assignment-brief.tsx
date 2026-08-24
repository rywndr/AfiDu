import { BookOpen, CalendarClock, ListChecks, Repeat, Timer } from 'lucide-react';

import { Fact, FactGrid, FactNote, FactValue, MetaItem } from '@/components/dashboard/facts';
import { SurfaceCard } from '@/components/dashboard/surfaces';
import { CardContent } from '@/components/ui/card';
import { formatDateTime, formatScore, pluralize } from '@/lib/format';
import type { StudentAssignment } from '@/lib/student-assignments';

/** What the assignment asks of the studentf. */
export function AssignmentBrief({ item }: { item: StudentAssignment }) {
  return (
    <SurfaceCard>
      <CardContent className="p-4 sm:p-5">
        <FactGrid>
          <Fact label="Focus">
            <FactValue className="font-semibold text-ink-strong capitalize">
              {item.category}
            </FactValue>
            <FactNote className="capitalize">{item.level}</FactNote>
          </Fact>

          <Fact label="Due">
            <FactValue>
              <MetaItem icon={CalendarClock} align="start">
                <span>
                  {item.dueAt ? formatDateTime(item.dueAt) : 'No due date'}
                  {item.allowLate ? (
                    <span className="block text-xs text-ink-subtle">
                      Late work accepted
                    </span>
                  ) : null}
                </span>
              </MetaItem>
            </FactValue>
          </Fact>

          <Fact label="Marks">
            <FactValue>
              <MetaItem icon={ListChecks}>
                {formatScore(item.maxPoints)} points over{' '}
                {pluralize(item.questionCount, 'question')}
              </MetaItem>
            </FactValue>
            <FactNote className="mt-1">
              <MetaItem icon={Repeat}>
                {item.attemptsUsed} of {pluralize(item.maxAttempts, 'attempt')} used
              </MetaItem>
            </FactNote>
          </Fact>

          <Fact label="Time">
            <FactValue>
              <MetaItem icon={Timer}>
                {item.timeLimitMinutes
                  ? `${item.timeLimitMinutes} minutes once you start`
                  : 'No time limit'}
              </MetaItem>
            </FactValue>
          </Fact>

          {item.materialTitle ? (
            <Fact label="Read first" className="sm:col-span-2 lg:col-span-4">
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
