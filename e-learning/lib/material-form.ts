/**
 * The mapping either side of the module form: the row on the way in, the API
 * payload on the way out. The two API schemas differ only in whether a file is
 * required, so `CreateMaterialInput` describes both requests.
 */
import type { UseFormReturn } from 'react-hook-form';

import { LEVELS, SUBJECT_CATEGORIES } from '@/lib/choices';
import type { CreateMaterialInput, MaterialFormValues } from '@/lib/form-schemas';
import type { UploadedFile } from '@/lib/material-upload';
import type { EditableMaterial } from '@/lib/study-materials';

/** What the sections of the form need from their parent. */
export type MaterialSectionProps = {
  form: UseFormReturn<MaterialFormValues>;
  disabled: boolean;
};

export function toMaterialFormValues(
  initial: EditableMaterial | undefined,
  suggestedLevel: string | null,
  storageReady: boolean,
): MaterialFormValues {
  const fallbackLevel = LEVELS.includes(suggestedLevel as (typeof LEVELS)[number])
    ? (suggestedLevel as (typeof LEVELS)[number])
    : LEVELS[0];

  return {
    title: initial?.title ?? '',
    // a deployment without storage can only take write-ups
    materialType: initial?.materialType ?? (storageReady ? 'pdf' : 'write_up'),
    category: initial?.category ?? SUBJECT_CATEGORIES[0].value,
    level: initial?.level ?? fallbackLevel,
    status: initial?.status ?? 'draft',
    description: initial?.description ?? '',
    content: initial?.content ?? '',
    // lets the schema tell "already has a PDF" from "needs one chosen"
    existingFileType: initial?.file ? initial.materialType : null,
    file: null,
  };
}

export function toMaterialInput(
  classId: number,
  values: MaterialFormValues,
  file: UploadedFile | null,
): CreateMaterialInput {
  return {
    classId,
    title: values.title,
    description: values.description,
    materialType: values.materialType,
    category: values.category,
    level: values.level,
    status: values.status,
    content: values.content,
    file,
  };
}
