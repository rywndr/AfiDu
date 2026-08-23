import Link from 'next/link';
import { BookOpen, FileText, Pencil, UserRound, Video } from 'lucide-react';

import { FileActions } from '@/components/dashboard/file-links';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { statusBadgeClass } from '@/lib/choices';
import { formatBytes, formatDate } from '@/lib/format';
import type { MaterialSummary } from '@/lib/study-materials';
import { cn } from '@/lib/utils';

import { DeleteMaterialButton } from './material-actions';

/** `StudyMaterial.TYPE_CHOICES`, as icons. */
const typeIcon = {
  pdf: FileText,
  video: Video,
  write_up: BookOpen,
} as const;

export function MaterialIcon({ material }: { material: MaterialSummary }) {
  const Icon = typeIcon[material.materialType as keyof typeof typeIcon] ?? FileText;

  return (
    <IconTile tone={material.materialType === 'video' ? 'cool' : 'warm'}>
      <Icon aria-hidden="true" strokeWidth={1.8} />
    </IconTile>
  );
}

export function MaterialBadges({ material }: { material: MaterialSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge className={cn('capitalize', statusBadgeClass(material.status))}>
        {material.status}
      </Badge>
      <Badge className="bg-shell text-ink-soft capitalize">{material.category}</Badge>
      <Badge className="bg-shell text-ink-soft capitalize">{material.level}</Badge>
    </div>
  );
}

export function MaterialMeta({ material }: { material: MaterialSummary }) {
  return (
    <>
      <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
        <UserRound aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">
          {material.uploaderName
            ? `Uploaded by ${material.uploaderName}`
            : 'Uploader not recorded'}
        </span>
      </p>
      <p className="mt-1 text-xs break-words text-ink-subtle">
        Added {formatDate(material.uploadedAt)}
        {material.originalFilename ? ` · ${material.originalFilename}` : ''}
        {material.fileSizeBytes ? ` · ${formatBytes(material.fileSizeBytes)}` : ''}
      </p>
    </>
  );
}

/** Write-ups have no file, so nothing to open. */
export function MaterialFileLinks({ material }: { material: MaterialSummary }) {
  if (!material.file) return null;

  return (
    <FileActions
      href={`/api/study-materials/${material.id}/file`}
      className="text-sm"
    />
  );
}

export function MaterialActions({
  material,
  classId,
}: {
  material: MaterialSummary;
  classId: number;
}) {
  return (
    <>
      <Link
        href={`/teacher/module/${classId}/${material.id}/edit`}
        className={buttonVariants({ variant: 'secondary', size: 'sm' })}
      >
        <Pencil aria-hidden="true" />
        Edit
      </Link>
      <DeleteMaterialButton
        classId={classId}
        materialId={material.id}
        title={material.title}
      />
    </>
  );
}
