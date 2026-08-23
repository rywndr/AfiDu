'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';

import {
  FormAlert,
  FormNotice,
  FormSubmitRow,
} from '@/components/form/form-shell';
import { apiRequest } from '@/lib/api-client';
import {
  materialFormSchema,
  type MaterialFormValues,
} from '@/lib/form-schemas';
import { toMaterialFormValues, toMaterialInput } from '@/lib/material-form';
import { uploadMaterialFile, type UploadedFile } from '@/lib/material-upload';
import { UploadError } from '@/lib/upload';
import type { EditableMaterial } from '@/lib/study-materials';

import { ModuleBody } from './module-body';
import { ModuleFields } from './module-fields';
import {
  UploadProgress,
  uploadPhaseLabel,
  type UploadPhase,
} from './upload-progress';

type ModuleFormProps = {
  classId: number;
  suggestedLevel: string | null;
  storageReady: boolean;
  initialMaterial?: EditableMaterial;
};

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
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [percent, setPercent] = useState<number | null>(0);
  const [requestError, setRequestError] = useState<string | null>(null);

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: toMaterialFormValues(initialMaterial, suggestedLevel, storageReady),
  });

  const busy = phase !== 'idle';

  const onSubmit = form.handleSubmit(async (values) => {
    if (busy) return;
    setRequestError(null);

    try {
      let uploaded: UploadedFile | null = null;

      if (values.materialType !== 'write_up' && values.file) {
        setPhase('preparing');
        setPercent(0);
        const controller = new AbortController();
        setAbortController(controller);
        try {
          uploaded = await uploadMaterialFile({
            classId,
            materialType: values.materialType,
            file: values.file,
            signal: controller.signal,
            onUploadStart: () => setPhase('uploading'),
            onProgress: setPercent,
          });
        } finally {
          setAbortController(null);
        }
      }

      setPhase('saving');
      await apiRequest<{ success: true }>(
        initialMaterial
          ? `/api/study-materials/${initialMaterial.id}`
          : '/api/study-materials',
        {
          method: initialMaterial ? 'PATCH' : 'POST',
          body: JSON.stringify(toMaterialInput(classId, values, uploaded)),
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
      {storageReady ? null : (
        <FormNotice className="mb-5">
          <span>
            File storage is not configured.         </span>
        </FormNotice>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <ModuleFields
          form={form}
          disabled={busy}
          suggestedLevel={suggestedLevel}
          storageReady={storageReady}
        />
        <ModuleBody
          form={form}
          disabled={busy}
          storageReady={storageReady}
          isEditing={isEditing}
          initialMaterial={initialMaterial}
          onFileChosen={() => setRequestError(null)}
        />
      </div>

      <UploadProgress
        phase={phase}
        percent={percent}
        onCancel={() => abortController?.abort()}
      />

      <FormAlert message={requestError} className="mt-4" />

      <FormSubmitRow busy={busy} className="mt-5">
        {isEditing ? <Save aria-hidden="true" /> : <Upload aria-hidden="true" />}
        {uploadPhaseLabel(phase, isEditing)}
      </FormSubmitRow>
    </form>
  );
}
