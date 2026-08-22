import { z } from 'zod';

import {
  LEVELS,
  MATERIAL_STATUSES,
  MATERIAL_TYPES,
  SUBJECT_CATEGORIES,
  validateUpload,
} from '@/lib/choices';

const materialTypes = MATERIAL_TYPES.map(({ value }) => value) as [
  (typeof MATERIAL_TYPES)[number]['value'],
  ...(typeof MATERIAL_TYPES)[number]['value'][],
];
const subjectCategories = SUBJECT_CATEGORIES.map(({ value }) => value) as [
  (typeof SUBJECT_CATEGORIES)[number]['value'],
  ...(typeof SUBJECT_CATEGORIES)[number]['value'][],
];
const materialStatuses = MATERIAL_STATUSES.map(({ value }) => value) as [
  (typeof MATERIAL_STATUSES)[number]['value'],
  ...(typeof MATERIAL_STATUSES)[number]['value'][],
];

export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email('Enter a valid email address.')),
  password: z.string().min(1, 'Enter your password.'),
});

export type LoginValues = z.infer<typeof loginSchema>;

const materialFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Enter a title.')
    .max(255, 'Titles are limited to 255 characters.'),
  materialType: z.enum(materialTypes, { error: 'Choose a material type.' }),
  category: z.enum(subjectCategories, { error: 'Choose a category.' }),
  level: z.enum(LEVELS, { error: 'Choose a level.' }),
  status: z.enum(materialStatuses, { error: 'Choose a status.' }),
  description: z.string().max(10_000, 'The description is too long.'),
  content: z.string(),
});

/** Browser form schema. File metadata is validated again by the API. */
export const materialFormSchema = materialFieldsSchema
  .extend({
    existingFileType: z.enum(materialTypes).nullable(),
    file: z.custom<File | null>(
      (value) =>
        value === null ||
        (typeof File !== 'undefined' && value instanceof File),
      { error: 'Choose a valid file.' },
    ),
  })
  .superRefine((values, context) => {
    if (values.materialType === 'write_up') {
      if (!values.content.trim()) {
        context.addIssue({
          code: 'custom',
          path: ['content'],
          message: 'Write-up materials must include content.',
        });
      }
      return;
    }

    if (!values.file) {
      if (values.existingFileType !== values.materialType) {
        context.addIssue({
          code: 'custom',
          path: ['file'],
          message: 'Choose a file to upload.',
        });
      }
      return;
    }

    const problem = validateUpload(
      values.materialType,
      values.file.name,
      values.file.size,
    );
    if (problem) {
      context.addIssue({ code: 'custom', path: ['file'], message: problem });
    }
  });

export type MaterialFormValues = z.infer<typeof materialFormSchema>;

export const uploadTicketSchema = z.object({
  classId: z.number().int().positive(),
  materialType: z.enum(materialTypes),
  filename: z.string().trim().min(1).max(255),
  size: z.number().int().positive(),
  contentType: z.string().trim().min(1).max(100),
});

const uploadedFileSchema = z.object({
  key: z
    .string()
    .regex(
      /^study_materials\/\d{4}\/\d{2}\/[a-f0-9]{32}\.[a-z0-9]+$/,
      'Invalid upload key.',
    ),
  originalFilename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100),
  size: z.number().int().positive(),
  uploadToken: z.string().min(1),
});

export const createMaterialSchema = materialFieldsSchema
  .extend({
    classId: z.number().int().positive(),
    file: uploadedFileSchema.nullable(),
  })
  .superRefine((values, context) => {
    const isWriteUp = values.materialType === 'write_up';
    if (isWriteUp && !values.content.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['content'],
        message: 'Write-up materials must include content.',
      });
    }
    if (!isWriteUp && !values.file) {
      context.addIssue({
        code: 'custom',
        path: ['file'],
        message: 'PDF and video materials require a file.',
      });
    }
    if (!isWriteUp && values.file) {
      const problem = validateUpload(
        values.materialType,
        values.file.originalFilename,
        values.file.size,
      );
      if (problem) {
        context.addIssue({ code: 'custom', path: ['file'], message: problem });
      }
    }
  });

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;

export const updateMaterialSchema = materialFieldsSchema
  .extend({
    classId: z.number().int().positive(),
    file: uploadedFileSchema.nullable(),
  })
  .superRefine((values, context) => {
    if (values.materialType === 'write_up' && !values.content.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['content'],
        message: 'Write-up materials must include content.',
      });
    }
    if (values.materialType !== 'write_up' && values.file) {
      const problem = validateUpload(
        values.materialType,
        values.file.originalFilename,
        values.file.size,
      );
      if (problem) {
        context.addIssue({ code: 'custom', path: ['file'], message: problem });
      }
    }
  });

export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;

export const classMutationSchema = z.object({
  classId: z.number().int().positive(),
});

export const assignmentLinkSchema = classMutationSchema.extend({
  assignmentId: z.number().int().positive('Choose an assignment.'),
});

export const assignmentLinkFormSchema = z.object({
  assignmentId: z.number().int().positive('Choose an assignment.'),
});

export type AssignmentLinkFormValues = z.infer<typeof assignmentLinkFormSchema>;
