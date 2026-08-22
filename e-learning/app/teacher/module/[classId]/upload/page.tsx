import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/dashboard/page-header';
import { isB2Configured } from '@/lib/b2';
import { formatDays, formatTimeRange } from '@/lib/format';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';
import { getClassDetail } from '@/lib/study-materials';

import { ModuleForm } from './upload-form';

function parseClassId(value: string): number {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : Number.NaN;
}

export async function generateMetadata({
  params,
}: PageProps<'/teacher/module/[classId]/upload'>): Promise<Metadata> {
  const id = parseClassId((await params).classId);
  const detail = Number.isNaN(id) ? null : await getClassDetail(id);
  return {
    title: detail
      ? `Add a module to ${detail.name} | AfiDu E-Learning`
      : 'Add module | AfiDu E-Learning',
  };
}

export default async function UploadModulePage({
  params,
}: PageProps<'/teacher/module/[classId]/upload'>) {
  await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);

  const id = parseClassId((await params).classId);
  if (Number.isNaN(id)) notFound();
  const detail = await getClassDetail(id);
  if (!detail) notFound();

  return (
    <>
      <Link
        href={`/teacher/module/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink-strong"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to modules
      </Link>

      <PageHeader
        title="ADD MODULE"
        description={`${detail.name} · ${formatTimeRange(
          detail.startTime,
          detail.endTime,
        )} · ${formatDays(detail.days)}`}
      />

      <div className="w-full">
        <ModuleForm
          classId={id}
          suggestedLevel={detail.suggestedLevel}
          storageReady={isB2Configured()}
        />
      </div>
    </>
  );
}
