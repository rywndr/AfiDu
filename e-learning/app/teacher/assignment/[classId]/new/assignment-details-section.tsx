'use client';

import { SelectField, TextField, TextareaField } from '@/components/form/field';
import { FormGrid, FormSection } from '@/components/form/form-shell';
import { ASSIGNMENT_STATUSES, LEVELS, SUBJECT_CATEGORIES } from '@/lib/choices';
import type { AssignmentSectionProps } from '@/lib/assignment-form';
import type { MaterialOption } from '@/lib/assignments';

type DetailsSectionProps = AssignmentSectionProps & {
  suggestedLevel: string | null;
  materials: MaterialOption[];
};

export function AssignmentDetailsSection({
  form: {
    register,
    formState: { errors },
  },
  disabled,
  suggestedLevel,
  materials,
}: DetailsSectionProps) {
  const materialOptions = materials.map((material) => ({
    value: String(material.id),
    label:
      material.status === 'published'
        ? material.title
        : `${material.title} (${material.status})`,
  }));

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

        <SelectField
          id="materialId"
          label="Reference module"
          className="sm:col-span-2"
          options={materialOptions}
          placeholder="No module"
          disabled={disabled}
          error={errors.materialId?.message}
          hint={
            materials.length === 0
              ? 'This class has no modules yet. Add one from the Module page to link it here.'
              : 'The module students should read for this assignment.'
          }
          {...register('materialId')}
        />
      </FormGrid>
    </FormSection>
  );
}
