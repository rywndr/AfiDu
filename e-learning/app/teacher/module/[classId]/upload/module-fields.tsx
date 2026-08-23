'use client';

import { SelectField, TextField, TextareaField } from '@/components/form/field';
import {
  LEVELS,
  MATERIAL_STATUSES,
  MATERIAL_TYPES,
  SUBJECT_CATEGORIES,
} from '@/lib/choices';
import type { MaterialSectionProps } from '@/lib/material-form';

type ModuleFieldsProps = MaterialSectionProps & {
  suggestedLevel: string | null;
  storageReady: boolean;
};

/** Everything about a module except its body. */
export function ModuleFields({
  form: {
    register,
    setValue,
    clearErrors,
    formState: { errors },
  },
  disabled,
  suggestedLevel,
  storageReady,
}: ModuleFieldsProps) {
  // without B2 the only kind that can be created is a write-up
  const typeOptions = MATERIAL_TYPES.map((type) => ({
    value: type.value,
    label: type.label,
    disabled: !storageReady && type.value !== 'write_up',
  }));

  return (
    <>
      <TextField
        id="title"
        label="Title"
        className="sm:col-span-2"
        autoFocus
        maxLength={255}
        disabled={disabled}
        placeholder="e.g. Unit 3 reading pack"
        error={errors.title?.message}
        {...register('title')}
      />

      <SelectField
        id="materialType"
        label="Type"
        options={typeOptions}
        disabled={disabled}
        error={errors.materialType?.message}
        {...register('materialType', {
          onChange: () => {
            // the chosen file and the body error belong to the old type
            setValue('file', null);
            clearErrors(['file', 'content']);
          },
        })}
      />

      <SelectField
        id="category"
        label="Category"
        options={SUBJECT_CATEGORIES}
        disabled={disabled}
        error={errors.category?.message}
        {...register('category')}
      />

      <SelectField
        id="level"
        label="Level"
        options={LEVELS}
        disabled={disabled}
        error={errors.level?.message}
        hint={
          suggestedLevel
            ? `Most students in this class are ${suggestedLevel}.`
            : 'Recorded on the material; targeting still follows this class.'
        }
        {...register('level')}
      />

      <SelectField
        id="status"
        label="Status"
        options={MATERIAL_STATUSES}
        disabled={disabled}
        error={errors.status?.message}
        {...register('status')}
      />

      <TextareaField
        id="description"
        label="Description"
        className="sm:col-span-2"
        rows={3}
        disabled={disabled}
        placeholder="Optional description shown to students..."
        error={errors.description?.message}
        {...register('description')}
      />
    </>
  );
}
