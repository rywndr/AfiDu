import { materialFileHref } from '@/components/dashboard/file-links';
import { SurfaceCard } from '@/components/dashboard/surfaces';
import { CardContent } from '@/components/ui/card';
import type { StudentMaterial } from '@/lib/student-materials';

const WRITE_UP = 'write_up';

/**
 * The module itself, in whichever player its type calls for.
 */

function ModuleMedia({ material }: { material: StudentMaterial }) {
  if (material.materialType === WRITE_UP) {
    return (
      <article className="text-sm leading-relaxed whitespace-pre-line text-ink">
        {material.content}
      </article>
    );
  }

  if (material.materialType === 'video') {
    return (
      <video
        controls
        preload="metadata"
        src={materialFileHref(material.id)}
        className="aspect-video w-full rounded-2xl bg-ink-strong"
      />
    );
  }

  return (
    <iframe
      src={materialFileHref(material.id)}
      title={material.title}
      className="h-[70vh] w-full rounded-2xl border-0 bg-shell"
    />
  );
}

export function ModuleViewer({ material }: { material: StudentMaterial }) {
  const isWriteUp = material.materialType === WRITE_UP;
  if (isWriteUp ? !material.content.trim() : !material.file) return null;

  return (
    <SurfaceCard>
      <CardContent className="p-4 sm:p-5">
        <ModuleMedia material={material} />
      </CardContent>
    </SurfaceCard>
  );
}
