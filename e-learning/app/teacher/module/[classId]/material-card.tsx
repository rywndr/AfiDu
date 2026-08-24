import { MaterialTypeIcon } from '@/components/dashboard/material-type-icon';
import { SurfaceCard } from '@/components/dashboard/surfaces';
import { CardContent } from '@/components/ui/card';
import type { ListView } from '@/lib/list-view';
import type { LinkableAssignment, MaterialSummary } from '@/lib/study-materials';

import { AssignmentLinks, MaterialActionMenu } from './material-actions';
import {
  MaterialActions,
  MaterialBadges,
  MaterialFileLinks,
  MaterialMeta,
} from './material-parts';

type MaterialCardProps = {
  material: MaterialSummary;
  classId: number;
  assignments: LinkableAssignment[];
  view: ListView;
};

function MaterialRow({ material, classId, assignments }: Omit<MaterialCardProps, 'view'>) {
  return (
    <SurfaceCard>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3.5 sm:gap-4">
          <MaterialTypeIcon materialType={material.materialType} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold break-words text-ink-strong">
                  {material.title}
                </p>
                {material.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                    {material.description}
                  </p>
                ) : null}

                <div className="mt-2">
                  <MaterialBadges material={material} />
                </div>

                <div className="mt-2">
                  <MaterialMeta material={material} />
                </div>

                <div className="mt-2.5">
                  <MaterialFileLinks material={material} />
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-start gap-2 sm:justify-end">
                <MaterialActions material={material} classId={classId} />
              </div>
            </div>
          </div>
        </div>

        <AssignmentLinks
          classId={classId}
          materialId={material.id}
          linked={material.linkedAssignments}
          options={assignments}
        />
      </CardContent>
    </SurfaceCard>
  );
}

function MaterialTile({
  material,
  classId,
  assignments,
}: Omit<MaterialCardProps, 'view'>) {
  return (
    <SurfaceCard className="h-full">
      <CardContent className="flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <MaterialTypeIcon materialType={material.materialType} />

          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-base font-semibold break-words text-ink-strong">
              {material.title}
            </p>
            <div className="mt-2">
              <MaterialBadges material={material} />
            </div>
          </div>
        </div>

        {material.description ? (
          <p className="mt-3 line-clamp-2 text-sm text-ink-muted">
            {material.description}
          </p>
        ) : null}

        <div className="mt-3">
          <MaterialMeta material={material} />
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <MaterialFileLinks material={material} />
          <MaterialActionMenu
            classId={classId}
            materialId={material.id}
            title={material.title}
          />
        </div>

        <AssignmentLinks
          classId={classId}
          materialId={material.id}
          linked={material.linkedAssignments}
          options={assignments}
        />
      </CardContent>
    </SurfaceCard>
  );
}

export function MaterialCard({ view, ...props }: MaterialCardProps) {
  return view === 'grid' ? <MaterialTile {...props} /> : <MaterialRow {...props} />;
}
