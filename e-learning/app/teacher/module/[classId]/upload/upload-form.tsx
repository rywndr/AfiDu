'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Download,
  ExternalLink,
  Paperclip,
  Save,
  Upload,
  X,
} from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/api-client';
import {
  MATERIAL_STATUSES,
  MATERIAL_TYPES,
  MAX_PDF_SIZE_MB,
  MAX_VIDEO_SIZE_MB,
  LEVELS,
  SUBJECT_CATEGORIES,
  allowedExtensions,
} from '@/lib/choices';
import { formatBytes } from '@/lib/format';
import {
  materialFormSchema,
  type MaterialFormValues,
} from '@/lib/form-schemas';
import { UploadError, putWithProgress } from '@/lib/upload';
import { cn } from '@/lib/utils';
import type { EditableMaterial } from '@/lib/study-materials';

type ModuleFormProps = {
  classId: number;
  suggestedLevel: string | null;
  storageReady: boolean;
  initialMaterial?: EditableMaterial;
};

type Phase = 'idle' | 'preparing' | 'uploading' | 'saving';
type UploadTicket = {
  key: string;
  url: string;
  contentType: string;
  uploadToken: string;
};

const fieldClass =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50';
const labelClass = 'text-xs font-semibold tracking-wide text-ink-soft uppercase';

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className={labelClass}>
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-xs font-semibold text-destructive">
      {message}
    </p>
  ) : null;
}

export function ModuleForm({
  classId,
  suggestedLevel,
  storageReady,
  initialMaterial,
}: ModuleFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialMaterial);
  const [abortController, setAbortController] = useState<AbortController | null>(
    null,
  );
  const [phase, setPhase] = useState<Phase>('idle');
  const [percent, setPercent] = useState<number | null>(0);
  const [requestError, setRequestError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      title: initialMaterial?.title ?? '',
      materialType:
        initialMaterial?.materialType ?? (storageReady ? 'pdf' : 'write_up'),
      category: initialMaterial?.category ?? SUBJECT_CATEGORIES[0].value,
      level:
        initialMaterial?.level ??
        (suggestedLevel && LEVELS.includes(suggestedLevel as (typeof LEVELS)[number])
          ? (suggestedLevel as (typeof LEVELS)[number])
          : LEVELS[0]),
      status: initialMaterial?.status ?? 'draft',
      description: initialMaterial?.description ?? '',
      content: initialMaterial?.content ?? '',
      existingFileType: initialMaterial?.file ? initialMaterial.materialType : null,
      file: null,
    },
  });

  const materialType = useWatch({ control, name: 'materialType' });
  const selectedFile = useWatch({ control, name: 'file' });
  const needsFile = materialType !== 'write_up';
  const busy = phase !== 'idle';
  const extensions = allowedExtensions(materialType);
  const sizeLimit = materialType === 'video' ? MAX_VIDEO_SIZE_MB : MAX_PDF_SIZE_MB;

  const onSubmit = handleSubmit(async (values) => {
    if (busy) return;
    setRequestError(null);

    let uploaded: {
      key: string;
      originalFilename: string;
      mimeType: string;
      size: number;
      uploadToken: string;
    } | null = null;

    try {
      if (values.materialType !== 'write_up' && values.file) {
        setPhase('preparing');
        setPercent(0);
        const contentType = values.file.type || 'application/octet-stream';
        const ticket = await apiRequest<UploadTicket>(
          '/api/study-materials/upload-ticket',
          {
            method: 'POST',
            body: JSON.stringify({
              classId,
              materialType: values.materialType,
              filename: values.file.name,
              size: values.file.size,
              contentType,
            }),
          },
        );

        const controller = new AbortController();
        setAbortController(controller);
        setPhase('uploading');
        try {
          await putWithProgress({
            url: ticket.url,
            file: values.file,
            contentType: ticket.contentType,
            signal: controller.signal,
            onProgress: (progress) => setPercent(progress.percent),
          });
        } finally {
          setAbortController(null);
        }

        uploaded = {
          key: ticket.key,
          originalFilename: values.file.name,
          mimeType: contentType,
          size: values.file.size,
          uploadToken: ticket.uploadToken,
        };
      }

      setPhase('saving');
      await apiRequest<{ success: true }>(
        initialMaterial
          ? `/api/study-materials/${initialMaterial.id}`
          : '/api/study-materials',
        {
          method: initialMaterial ? 'PATCH' : 'POST',
          body: JSON.stringify({
            classId,
            title: values.title,
            description: values.description,
            materialType: values.materialType,
            category: values.category,
            level: values.level,
            status: values.status,
            content: values.content,
            file: uploaded,
          }),
        },
      );

      router.push(`/teacher/module/${classId}`);
      router.refresh();
    } catch (error) {
      setPhase('idle');
      setRequestError(
        error instanceof UploadError || error instanceof Error
          ? error.message
          : `Could not ${isEditing ? 'update' : 'add'} the module. Please try again.`,
      );
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-2xl bg-white p-4 shadow-card sm:p-6 lg:p-8"
    >
      {!storageReady ? (
        <p className="mb-5 flex items-start gap-2 rounded-xl bg-accent-warm-soft px-3 py-2.5 text-sm text-accent-warm-strong">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            File storage is not configured on this deployment. Existing file
            metadata can still be edited, but new or replacement files are disabled.
            Set the <code className="font-mono">B2_*</code> environment variables to
            enable uploads.
          </span>
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            autoFocus
            maxLength={255}
            disabled={busy}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'title-error' : undefined}
            placeholder="e.g. Unit 3 reading pack"
            {...register('title')}
          />
          <div id="title-error">
            <FieldError message={errors.title?.message} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="materialType">Type</Label>
          <select
            id="materialType"
            className={fieldClass}
            disabled={busy}
            aria-invalid={Boolean(errors.materialType)}
            {...register('materialType', {
              onChange: () => {
                setValue('file', null);
                clearErrors(['file', 'content']);
              },
            })}
          >
            {MATERIAL_TYPES.map((type) => (
              <option
                key={type.value}
                value={type.value}
                disabled={!storageReady && type.value !== 'write_up'}
              >
                {type.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.materialType?.message} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            className={fieldClass}
            disabled={busy}
            aria-invalid={Boolean(errors.category)}
            {...register('category')}
          >
            {SUBJECT_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.category?.message} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="level">Level</Label>
          <select
            id="level"
            className={fieldClass}
            disabled={busy}
            aria-invalid={Boolean(errors.level)}
            {...register('level')}
          >
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <FieldError message={errors.level?.message} />
          <p className="text-xs text-ink-subtle">
            {suggestedLevel
              ? `Most students in this class are ${suggestedLevel}.`
              : 'Recorded on the material; targeting still follows this class.'}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className={fieldClass}
            disabled={busy}
            aria-invalid={Boolean(errors.status)}
            {...register('status')}
          >
            {MATERIAL_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <FieldError message={errors.status?.message} />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            rows={3}
            disabled={busy}
            aria-invalid={Boolean(errors.description)}
            placeholder="Optional description shown to students..."
            className={cn(fieldClass, 'h-auto resize-y py-2')}
            {...register('description')}
          />
          <FieldError message={errors.description?.message} />
        </div>

        {initialMaterial?.file && storageReady ? (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={labelClass}>Current file</span>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
              <span className="flex min-w-0 items-center gap-1.5 text-ink-muted">
                <Paperclip aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">
                  {initialMaterial.originalFilename || 'Uploaded file'}
                  {initialMaterial.fileSizeBytes
                    ? ` · ${formatBytes(initialMaterial.fileSizeBytes)}`
                    : ''}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-3 font-semibold">
                <a
                  href={`/api/study-materials/${initialMaterial.id}/file`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-accent-primary hover:underline"
                >
                  <ExternalLink aria-hidden="true" className="size-4" />
                  Open
                </a>
                <a
                  href={`/api/study-materials/${initialMaterial.id}/file?download=1`}
                  className="inline-flex items-center gap-1.5 text-accent-primary hover:underline"
                >
                  <Download aria-hidden="true" className="size-4" />
                  Download
                </a>
              </span>
            </div>
          </div>
        ) : null}

        {needsFile ? (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="file">{isEditing ? 'Replacement file' : 'File'}</Label>
            <Controller
              control={control}
              name="file"
              render={({ field: { onChange, onBlur, name, ref } }) => (
                <input
                  ref={ref}
                  id="file"
                  name={name}
                  type="file"
                  disabled={busy || !storageReady}
                  accept={extensions.map((extension) => `.${extension}`).join(',')}
                  aria-invalid={Boolean(errors.file)}
                  onBlur={onBlur}
                  onChange={(event) => {
                    onChange(event.target.files?.[0] ?? null);
                    setRequestError(null);
                  }}
                  className="block w-full cursor-pointer rounded-lg border border-border bg-background p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent-warm-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-accent-warm-strong disabled:opacity-50"
                />
              )}
            />
            <FieldError message={errors.file?.message} />
            <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-subtle">
              <Paperclip aria-hidden="true" className="size-3.5 shrink-0" />
              <span>
                {extensions.map((extension) => extension.toUpperCase()).join(', ')} up
                to {sizeLimit}MB
                {selectedFile
                  ? ` · ${selectedFile.name} (${formatBytes(selectedFile.size)})`
                  : initialMaterial?.file &&
                      initialMaterial.materialType === materialType
                    ? ` · keeping ${initialMaterial.originalFilename}`
                    : ''}
              </span>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="content">Content</Label>
            <textarea
              id="content"
              rows={10}
              disabled={busy}
              aria-invalid={Boolean(errors.content)}
              placeholder="Write the lesson content here..."
              className={cn(fieldClass, 'h-auto resize-y py-2 font-mono')}
              {...register('content')}
            />
            <FieldError message={errors.content?.message} />
          </div>
        )}
      </div>

      {phase === 'uploading' || phase === 'saving' ? (
        <div className="mt-5" aria-live="polite">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-ink-soft">
            <span>
              {phase === 'saving'
                ? 'Saving module…'
                : percent === null
                  ? 'Uploading…'
                  : `Uploading… ${percent}%`}
            </span>
            {phase === 'uploading' ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => abortController?.abort()}
              >
                <X aria-hidden="true" />
                Cancel
              </Button>
            ) : null}
          </div>
          <Progress value={phase === 'saving' ? 100 : percent} />
        </div>
      ) : null}

      {requestError ? (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {requestError}
        </p>
      ) : null}

      <div className="mt-5 flex justify-stretch sm:justify-end">
        <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto">
          {isEditing ? <Save aria-hidden="true" /> : <Upload aria-hidden="true" />}
          {phase === 'preparing'
            ? 'Preparing…'
            : phase === 'uploading'
              ? 'Uploading…'
              : phase === 'saving'
                ? 'Saving…'
                : isEditing
                  ? 'Save changes'
                  : 'Add module'}
        </Button>
      </div>
    </form>
  );
}
