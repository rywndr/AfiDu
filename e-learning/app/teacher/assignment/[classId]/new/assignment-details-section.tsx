'use client';

import { Controller } from 'react-hook-form';

import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/form/field';
import { FormGrid, FormSection } from '@/components/form/form-shell';
import { SearchablePicker } from '@/components/form/searchable-picker';
import { ASSIGNMENT_STATUSES, LEVELS, SUBJECT_CATEGORIES } from '@/lib/choices';
import type { AssignmentSectionProps } from '@/lib/assignment-form';
import type { MaterialOption } from '@/lib/assignments';

type DetailsSectionProps = AssignmentSectionProps & {
  suggestedLevel: string | null;
  materials: MaterialOption[];
};

export function AssignmentDetailsSection({
  form: {
    control,
    register,
    formState: { errors },
  },
  disabled,
  suggestedLevel,
  materials,
}: DetailsSectionProps) {
  const materialOptions = [
    { value: '', label: 'No module' },
    ...materials.map((material) => ({
      value: String(material.id),
      label:
        material.status === 'published'
          ? material.title
          : `${material.title} (${material.status})`,
    })),
  ];

  return (
    <FormSection title="Details">
      <FormGrid>
        <TextField
          id="title"
          label="Title"
          className="sm:col-span-2"
          autoFocus
          maxLength={255}
          disabled={disabled}
          placeholder="e.g. Unit 3 reading comprehension"
          error={errors.title?.message}
          {...register('title')}
        />

        <SelectField
          id="status"
          label="Status"
          options={ASSIGNMENT_STATUSES}
          disabled={disabled}
          error={errors.status?.message}
          hint="Only published assignments are visible to students."
          {...register('status')}
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
              : 'Recorded on the assignment; targeting still follows this class.'
          }
          {...register('level')}
        />

        <TextareaField
          id="description"
          label="Description"
          className="sm:col-span-2"
          rows={3}
          disabled={disabled}
          placeholder="Instructions shown to students before they start..."
          error={errors.description?.message}
          {...register('description')}
        />

        <Controller
          name="materialId"
          control={control}
          render={({ field }) => (
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="materialId">Reference module</FieldLabel>
              <SearchablePicker
                id="materialId"
                value={field.value}
                onValueChange={field.onChange}
                options={materialOptions}
                title="Choose a reference module"
                placeholder="No module"
                searchPlaceholder="Search modules…"
                emptyMessage="No modules match your search."
                disabled={disabled}
                aria-invalid={Boolean(errors.materialId)}
                aria-describedby={
                  errors.materialId ? 'materialId-error' : undefined
                }
              />
              <FieldError
                id="materialId-error"
                message={errors.materialId?.message}
              />
              <FieldHint>
                {materials.length === 0
                  ? 'This class has no modules yet. Add one from the Module page to link it here.'
                  : 'The module students should read for this assignment.'}
              </FieldHint>
            </Field>
          )}
        />
      </FormGrid>
    </FormSection>
  );
}
