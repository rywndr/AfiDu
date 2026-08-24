import Link from 'next/link';
import { CalendarDays, ChevronRight } from 'lucide-react';

import { MetaItem } from '@/components/dashboard/facts';
import { LinkedNotice } from '@/components/dashboard/linked-notice';
import { MaterialTypeIcon } from '@/components/dashboard/material-type-icon';
import { SurfaceCard } from '@/components/dashboard/surfaces';
import { Badge } from '@/components/ui/badge';
import { CardContent } from '@/components/ui/card';
import { materialTypeLabel } from '@/lib/choices';
import { formatDate } from '@/lib/format';
import type { StudentMaterial } from '@/lib/student-materials';

/** One module on the student's list. */
export function StudentModuleCard({ material }: { material: StudentMaterial }) {
  return (
    <Link
      href={`/student/module/${material.id}`}
      className="block rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-accent-warm/50"
    >
      <SurfaceCard className="h-full transition-shadow hover:shadow-accent">
        <CardContent className="flex items-start gap-3.5 p-4 sm:gap-4 sm:p-5">
          <MaterialTypeIcon materialType={material.materialType} />

          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold break-words text-ink-strong">
              {material.title}
            </p>

            {material.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                {material.description}
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge className="bg-shell text-ink-soft">
                {materialTypeLabel(material.materialType)}
              </Badge>
              <Badge className="bg-shell text-ink-soft capitalize">
                {material.category}
              </Badge>
            </div>

            <div className="mt-2.5 flex flex-col gap-1 text-xs text-ink-subtle">
              <MetaItem icon={CalendarDays}>
                Added {formatDate(material.uploadedAt)}
              </MetaItem>
            </div>

            <LinkedNotice
              to="assignment"
              titles={material.linkedAssignments.map((item) => item.title)}
              className="mt-2.5"
            />
          </div>

          <ChevronRight
            aria-hidden="true"
            className="mt-1 size-5 shrink-0 text-ink-subtle"
          />
        </CardContent>
      </SurfaceCard>
    </Link>
  );
}
