import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/dashboard/page-header';
import { isB2Configured } from '@/lib/b2';
import { formatDays, formatTimeRange } from '@/lib/format';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';
import { getClassDetailBySlug } from '@/lib/study-materials';

import { ModuleForm } from './upload-form';

export async function generateMetadata({
  params,
}: PageProps<'/teacher/module/[classId]/upload'>): Promise<Metadata> {
  const classSlug = (await params).classId;
  const detail = await getClassDetailBySlug(classSlug);
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

  const classSlug = (await params).classId;
  const detail = await getClassDetailBySlug(classSlug);
  if (!detail) notFound();

  return (
    <>
      <Link
        href={`/teacher/module/${classSlug}`}
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
          classId={detail.id}
          classSlug={classSlug}
          suggestedLevel={detail.suggestedLevel}
          storageReady={isB2Configured()}
        />
      </div>
    </>
  );
}
