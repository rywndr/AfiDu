'use client';

import { Paperclip } from 'lucide-react';
import { Controller, useWatch } from 'react-hook-form';

import {
  Field,
  FieldError,
  FieldLabel,
  TextareaField,
  labelClass,
} from '@/components/form/field';
import { FileActions, FileMeta } from '@/components/dashboard/file-links';
import {
  MAX_PDF_SIZE_MB,
  MAX_VIDEO_SIZE_MB,
  allowedExtensions,
  type MaterialType,
} from '@/lib/choices';
import { formatBytes } from '@/lib/format';
import type { MaterialSectionProps } from '@/lib/material-form';
import type { EditableMaterial } from '@/lib/study-materials';

type ModuleBodyProps = MaterialSectionProps & {
  storageReady: boolean;
  isEditing: boolean;
  initialMaterial?: EditableMaterial;
  /** Lets the form drop a stale request error once a new file is picked. */
  onFileChosen?: () => void;
};

const fileInputClass =
  'block w-full cursor-pointer rounded-lg border border-border bg-background p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent-warm-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-accent-warm-strong disabled:opacity-50';

/** The file already on the record, which a save keeps unless one is chosen. */
function CurrentFile({ material }: { material: EditableMaterial }) {
  return (
    <Field className="sm:col-span-2">
      <span className={labelClass}>Current file</span>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm">
        <FileMeta
          filename={material.originalFilename}
          sizeBytes={material.fileSizeBytes}
        />
        <FileActions href={`/api/study-materials/${material.id}/file`} />
      </div>
    </Field>
  );
}

/** What the picker accepts, and what it has picked. */
function FileHint({
  materialType,
  selectedFile,
  initialMaterial,
}: {
  materialType: MaterialType;
  selectedFile: File | null;
  initialMaterial?: EditableMaterial;
}) {
  const extensions = allowedExtensions(materialType);
  const sizeLimit = materialType === 'video' ? MAX_VIDEO_SIZE_MB : MAX_PDF_SIZE_MB;
  const keeping =
    initialMaterial?.file && initialMaterial.materialType === materialType
      ? ` · keeping ${initialMaterial.originalFilename}`
      : '';

  return (
    <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-subtle">
      <Paperclip aria-hidden="true" className="size-3.5 shrink-0" />
      <span>
        {extensions.map((extension) => extension.toUpperCase()).join(', ')} up to{' '}
        {sizeLimit}MB
        {selectedFile
          ? ` · ${selectedFile.name} (${formatBytes(selectedFile.size)})`
          : keeping}
      </span>
    </p>
  );
}

/**
 * The body of a module
 */
export function ModuleBody({
  form,
  disabled,
  storageReady,
  isEditing,
  initialMaterial,
  onFileChosen,
}: ModuleBodyProps) {
  const {
    control,
    register,
    formState: { errors },
  } = form;
  const materialType = useWatch({ control, name: 'materialType' });
  const selectedFile = useWatch({ control, name: 'file' });
  const extensions = allowedExtensions(materialType);

  return (
    <>
      {initialMaterial?.file && storageReady ? (
        <CurrentFile material={initialMaterial} />
      ) : null}

      {materialType === 'write_up' ? (
        <TextareaField
          id="content"
          label="Content"
          className="sm:col-span-2"
          rows={10}
          disabled={disabled}
          placeholder="Write the lesson content here..."
          error={errors.content?.message}
          {...register('content')}
        />
      ) : (
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="file">
            {isEditing ? 'Replacement file' : 'File'}
          </FieldLabel>
          <Controller
            control={control}
            name="file"
            render={({ field: { onChange, onBlur, name, ref } }) => (
              <input
                ref={ref}
                id="file"
                name={name}
                type="file"
                disabled={disabled || !storageReady}
                accept={extensions.map((extension) => `.${extension}`).join(',')}
                aria-invalid={Boolean(errors.file)}
                onBlur={onBlur}
                onChange={(event) => {
                  onChange(event.target.files?.[0] ?? null);
                  onFileChosen?.();
                }}
                className={fileInputClass}
              />
            )}
          />
          <FieldError message={errors.file?.message} />
          <FileHint
            materialType={materialType}
            selectedFile={selectedFile}
            initialMaterial={initialMaterial}
          />
        </Field>
      )}
    </>
  );
}
