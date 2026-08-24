import { BookOpen, FileText, Video } from 'lucide-react';

import { IconTile } from '@/components/ui/icon-tile';

/** `StudyMaterial.TYPE_CHOICES`, as icons. */
const typeIcon = {
  pdf: FileText,
  video: Video,
  write_up: BookOpen,
} as const;

/** The tinted tile every material is listed behind, on both sides of the app. */
export function MaterialTypeIcon({ materialType }: { materialType: string }) {
  const Icon = typeIcon[materialType as keyof typeof typeIcon] ?? FileText;

  return (
    <IconTile tone={materialType === 'video' ? 'cool' : 'warm'}>
      <Icon aria-hidden="true" strokeWidth={1.8} />
    </IconTile>
  );
}
