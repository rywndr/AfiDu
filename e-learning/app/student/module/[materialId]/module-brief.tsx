import Link from 'next/link';
import { CalendarDays, ClipboardCheck } from 'lucide-react';

import { Fact, FactGrid, FactNote, FactValue, MetaItem } from '@/components/dashboard/facts';
import { FileActions, materialFileHref } from '@/components/dashboard/file-links';
import { SurfaceCard } from '@/components/dashboard/surfaces';
import { CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import type { StudentMaterial } from '@/lib/student-materials';

/** The assignments this module was attached to, as links a student can follow. */
function AssignmentLinks({ material }: { material: StudentMaterial }) {
  if (material.linkedAssignments.length === 0) return null;

  return (
    <Fact label="Assignment" className="sm:col-span-2">
      <FactValue className="flex flex-col gap-1 text-sm">
        {material.linkedAssignments.map((item) => (
          <Link
            key={item.id}
            href={`/student/assignment/${item.id}`}
            className="font-semibold text-accent-primary hover:underline"
          >
            <MetaItem icon={ClipboardCheck}>
              <span className="truncate">{item.title}</span>
            </MetaItem>
          </Link>
        ))}
      </FactValue>
    </Fact>
  );
}

/** What the module is and where to get it. */
export function ModuleBrief({ material }: { material: StudentMaterial }) {
  return (
    <SurfaceCard>
      <CardContent className="p-4 sm:p-5">
        <FactGrid>
          <Fact label="Focus">
            <FactValue className="font-semibold text-ink-strong capitalize">
              {material.category}
            </FactValue>
            <FactNote className="capitalize">{material.level}</FactNote>
          </Fact>

          <Fact label="Added">
            <FactValue>
              <MetaItem icon={CalendarDays}>{formatDate(material.uploadedAt)}</MetaItem>
            </FactValue>
          </Fact>

          {material.file ? (
            <Fact label="File">
              <FactValue className="text-sm">
                <FileActions href={materialFileHref(material.id)} />
              </FactValue>
            </Fact>
          ) : null}

          <AssignmentLinks material={material} />
        </FactGrid>

        {material.description ? (
          <p className="mt-4 border-t border-shell-divider pt-4 text-sm whitespace-pre-line text-ink-muted">
            {material.description}
          </p>
        ) : null}
      </CardContent>
    </SurfaceCard>
  );
}
