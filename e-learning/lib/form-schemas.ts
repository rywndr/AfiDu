import { z } from 'zod';

import {
  ASSIGNMENT_STATUSES,
  LEVELS,
  MATERIAL_STATUSES,
  MATERIAL_TYPES,
  QUESTION_KINDS,
  SCORE_TARGET_VALUES,
  SCORE_YEARS,
  SEMESTERS,
  SUBJECT_CATEGORIES,
  questionHasChoices,
  validateQuestionAudio,
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
const assignmentStatuses = ASSIGNMENT_STATUSES.map(({ value }) => value) as [
  (typeof ASSIGNMENT_STATUSES)[number]['value'],
  ...(typeof ASSIGNMENT_STATUSES)[number]['value'][],
];
const questionKinds = QUESTION_KINDS.map(({ value }) => value) as [
  (typeof QUESTION_KINDS)[number]['value'],
  ...(typeof QUESTION_KINDS)[number]['value'][],
];
const semesters = SEMESTERS.map(({ value }) => value) as [
  (typeof SEMESTERS)[number]['value'],
  ...(typeof SEMESTERS)[number]['value'][],
];

export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email('Enter a valid email address.')),
  password: z.string().min(1, 'Enter your password.'),
  rememberMe: z.boolean(),
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

/* ------------------------------------------------------------------ *
 * Assignments
 *
 * The browser form keeps every numeric and date field as the string the
 * input holds, and converts on submit; the API schemas below take the
 * converted shape. `MAX_DECIMAL` is what `numeric(6, 2)` can store.
 * ------------------------------------------------------------------ */

const MAX_DECIMAL = 9999.99;

/** A required non-negative decimal typed into a text input. */
function decimalString(error: string, max = MAX_DECIMAL) {
  return z
    .string()
    .trim()
    .refine((value) => {
      if (!value) return false;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= max;
    }, { error });
}

/** The same, but an empty field is allowed and means "not set". */
function optionalDecimalString(error: string) {
  return z
    .string()
    .trim()
    .refine((value) => {
      if (!value) return true;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_DECIMAL;
    }, { error });
}

/** A whole number typed into a text input; `optional` also allows an empty one. */
function integerString(
  bounds: { min: number; max: number; error: string; optional?: boolean },
) {
  return z
    .string()
    .trim()
    .refine((value) => {
      if (!value) return Boolean(bounds.optional);
      const parsed = Number(value);
      return (
        Number.isInteger(parsed) && parsed >= bounds.min && parsed <= bounds.max
      );
    }, { error: bounds.error });
}

/** Either empty or something `Date` can parse, in any of the formats used here. */
const dateTimeString = z
  .string()
  .trim()
  .max(40)
  .refine((value) => value === '' || !Number.isNaN(Date.parse(value)), {
    error: 'Enter a valid date and time.',
  });

const choiceFieldsSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Enter the option text.')
    .max(500, 'Options are limited to 500 characters.'),
  isCorrect: z.boolean(),
});

/**
 * Choice questions need a usable answer key, otherwise auto-grading has nothing
 * to compare against -- Django's `grade_objective` skips such a question rather
 * than scoring it zero, which silently loses marks.
 */
function refineChoices(
  kind: string,
  choices: { isCorrect: boolean }[],
  context: z.RefinementCtx,
  path: (string | number)[],
) {
  if (!questionHasChoices(kind)) return;

  if (choices.length < 2) {
    context.addIssue({
      code: 'custom',
      path: [...path, 'choices'],
      message: 'Add at least two options.',
    });
    return;
  }

  const correct = choices.filter((choice) => choice.isCorrect).length;
  if (correct === 0) {
    context.addIssue({
      code: 'custom',
      path: [...path, 'choices'],
      message: 'Mark at least one option as correct.',
    });
  }
  if (kind !== 'multi_select' && correct > 1) {
    context.addIssue({
      code: 'custom',
      path: [...path, 'choices'],
      message: 'Only multi-select questions may have several correct options.',
    });
  }
}

const questionPrompt = z
  .string()
  .trim()
  .min(1, 'Enter the question.')
  .max(10_000, 'The question is too long.');

const questionExplanation = z
  .string()
  .max(10_000, 'The explanation is too long.');

const browserQuestionAudio = z.custom<File | null>(
  (value) =>
    value === null || (typeof File !== 'undefined' && value instanceof File),
  { error: 'Choose a valid MP3 file.' },
);

const questionFormSchema = z.object({
  id: z.number().int().positive().nullable(),
  kind: z.enum(questionKinds, { error: 'Choose a question type.' }),
  prompt: questionPrompt,
  points: decimalString('Enter the points as a number, 0 or more.'),
  explanation: questionExplanation,
  isRequired: z.boolean(),
  choices: z.array(choiceFieldsSchema).max(20, 'A question may have 20 options.'),
  audio: browserQuestionAudio,
  hasAudio: z.boolean(),
  audioUrl: z.string().nullable(),
});

const assignmentSharedSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Enter a title.')
    .max(255, 'Titles are limited to 255 characters.'),
  category: z.enum(subjectCategories, { error: 'Choose a category.' }),
  level: z.enum(LEVELS, { error: 'Choose a level.' }),
  status: z.enum(assignmentStatuses, { error: 'Choose a status.' }),
  description: z.string().max(10_000, 'The description is too long.'),
  openAt: dateTimeString,
  dueAt: dateTimeString,
  allowLate: z.boolean(),
  allowFileUpload: z.boolean(),
  autoGrade: z.boolean(),
  shuffleQuestions: z.boolean(),
  revealAnswersAfterSubmit: z.boolean(),
});

/**
 * The checks `Assignment.clean` performs. Reproduced here so the browser reports
 * them as field errors instead of the database rejecting the row -- the check
 * constraints and `full_clean` on the Django side remain the real gate.
 */
function refineAssignment(
  values: {
    openAt: string;
    dueAt: string;
    year: string | number | null;
    semester: string | null;
    scoreTarget: string | null;
  },
  context: z.RefinementCtx,
) {
  if (values.openAt && values.dueAt) {
    if (Date.parse(values.dueAt) <= Date.parse(values.openAt)) {
      context.addIssue({
        code: 'custom',
        path: ['dueAt'],
        message: 'The due date must be after the open date.',
      });
    }
  }

  const hasYear = values.year !== '' && values.year !== null;
  const hasSemester = values.semester !== '' && values.semester !== null;
  const hasTarget = values.scoreTarget !== '' && values.scoreTarget !== null;
  if (hasYear || hasSemester || hasTarget) {
    if (!hasYear) {
      context.addIssue({
        code: 'custom',
        path: ['year'],
        message: 'Choose a score year.',
      });
    }
    if (!hasSemester) {
      context.addIssue({
        code: 'custom',
        path: ['semester'],
        message: 'Choose a semester.',
      });
    }
    if (!hasTarget) {
      context.addIssue({
        code: 'custom',
        path: ['scoreTarget'],
        message: 'Choose the score field this assignment updates.',
      });
    }
  }
}

/** Browser form schema. Re-validated by the API in its converted form. */
export const assignmentFormSchema = assignmentSharedSchema
  .extend({
    materialId: z.string(),
    year: z.union([
      z.literal(''),
      z.enum(SCORE_YEARS, { error: 'Choose a score year.' }),
    ]),
    semester: z.union([z.literal(''), z.enum(semesters)]),
    scoreTarget: z.union([z.literal(''), z.enum(SCORE_TARGET_VALUES)]),
    timeLimitMinutes: integerString({
      min: 1,
      max: 1440,
      optional: true,
      error: 'Enter a time limit between 1 and 1440 minutes.',
    }),
    maxAttempts: integerString({
      min: 1,
      max: 100,
      error: 'Allow between 1 and 100 attempts.',
    }),
    maxPoints: decimalString('Enter total points from 0 to 100.', 100),
    questions: z.array(questionFormSchema).max(100, 'An assignment may have 100 questions.'),
  })
  .superRefine((values, context) => {
    refineAssignment(values, context);

    values.questions.forEach((item, index) => {
      refineChoices(item.kind, item.choices, context, ['questions', index]);
      if (item.audio) {
        const problem = validateQuestionAudio(item.audio.name, item.audio.size);
        if (problem) {
          context.addIssue({
            code: 'custom',
            path: ['questions', index, 'audio'],
            message: problem,
          });
        }
      }
    });
  });

export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;
export type QuestionFormValues = z.infer<typeof questionFormSchema>;

const uploadedQuestionAudioSchema = z.object({
  key: z
    .string()
    .regex(/^questions\/\d{4}\/\d{2}\/[a-f0-9]{32}\.mp3$/, 'Invalid audio key.'),
  originalFilename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100),
  size: z.number().int().positive(),
  uploadToken: z.string().min(1),
});

const questionInputSchema = z.object({
  id: z.number().int().positive().nullable(),
  kind: z.enum(questionKinds),
  prompt: questionPrompt,
  points: z.number().min(0).max(MAX_DECIMAL),
  explanation: questionExplanation,
  isRequired: z.boolean(),
  choices: z.array(choiceFieldsSchema).max(20),
  audio: uploadedQuestionAudioSchema.nullable(),
});

const assignmentInputSchema = assignmentSharedSchema
  .extend({
    classId: z.number().int().positive(),
    materialId: z.number().int().positive().nullable(),
    year: z.number().int().min(2000).max(2100).nullable(),
    semester: z.enum(semesters).nullable(),
    scoreTarget: z.enum(SCORE_TARGET_VALUES).nullable(),
    timeLimitMinutes: z.number().int().min(1).max(1440).nullable(),
    maxAttempts: z.number().int().min(1).max(100),
    maxPoints: z.number().min(0).max(100),
    questions: z.array(questionInputSchema).max(100),
  })
  .superRefine((values, context) => {
    refineAssignment(values, context);
    values.questions.forEach((item, index) => {
      refineChoices(item.kind, item.choices, context, ['questions', index]);
      if (item.audio) {
        const problem = validateQuestionAudio(
          item.audio.originalFilename,
          item.audio.size,
        );
        if (problem) {
          context.addIssue({
            code: 'custom',
            path: ['questions', index, 'audio'],
            message: problem,
          });
        }
      }
    });
  });

export const createAssignmentSchema = assignmentInputSchema;
export const updateAssignmentSchema = assignmentInputSchema;

export type AssignmentInput = z.infer<typeof assignmentInputSchema>;

export const questionAudioUploadTicketSchema = z.object({
  classId: z.number().int().positive(),
  filename: z.string().trim().min(1).max(255),
  size: z.number().int().positive(),
  contentType: z.string().trim().min(1).max(100),
});

export type UploadedQuestionAudio = z.infer<typeof uploadedQuestionAudioSchema>;

/* ------------------------------------------------------------------ *
 * Grading
 * ------------------------------------------------------------------ */

/** The statuses a teacher may move a submission to from the grading screen. */
const gradeStatuses = ['submitted', 'graded', 'returned'] as const;

const answerGradeSchema = z.object({
  answerId: z.number().int().positive(),
  awardedPoints: z.number().min(0).max(MAX_DECIMAL).nullable(),
  feedback: z.string().max(5_000, 'The feedback is too long.'),
});

export const gradeSubmissionSchema = z.object({
  assignmentId: z.number().int().positive(),
  status: z.enum(gradeStatuses, { error: 'Choose a status.' }),
  feedback: z.string().max(10_000, 'The feedback is too long.'),
  /**
   * Overrides the sum of the per-answer points. The only way to mark an
   * assignment that has no questions, such as a plain file upload.
   */
  manualScore: z.number().min(0).max(MAX_DECIMAL).nullable(),
  answers: z.array(answerGradeSchema).max(200),
});

export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;

/** Which student's attempts to throw away, and the class that owns them. */
export const resetSubmissionsSchema = classMutationSchema.extend({
  studentId: z.number().int().positive(),
});

/** The same payload as the browser holds it, before the numbers are parsed. */
export const gradeFormSchema = z.object({
  status: z.enum(gradeStatuses, { error: 'Choose a status.' }),
  feedback: z.string().max(10_000, 'The feedback is too long.'),
  manualScore: optionalDecimalString(
    'Enter the score as a number, or leave it empty.',
  ),
  answers: z.array(
    z.object({
      answerId: z.number().int().positive(),
      awardedPoints: optionalDecimalString(
        'Enter the awarded points as a number, or leave it empty.',
      ),
      feedback: z.string().max(5_000, 'The feedback is too long.'),
    }),
  ),
});

export type GradeFormValues = z.infer<typeof gradeFormSchema>;

// Student attemps

const MAX_ANSWER_LENGTH = 20_000;

export const startAttemptSchema = z.object({
  assignmentId: z.number().int().positive(),
});

const attemptAnswerSchema = z.object({
  questionId: z.number().int().positive(),
  /** Multiple choice and true/false. */
  selectedChoiceId: z.number().int().positive().nullable(),
  /** Multi select. */
  selectedChoiceIds: z.array(z.number().int().positive()).max(20),
  /** Essay. */
  textAnswer: z.string().max(MAX_ANSWER_LENGTH, 'That answer is too long.'),
});

/** `submissions/YYYY/MM/<uuid>.<ext>`, the layout `SubmissionFile` writes to. */
const submissionFileSchema = z.object({
  key: z
    .string()
    .regex(/^submissions\/\d{4}\/\d{2}\/[a-f0-9]{32}\.[a-z0-9]+$/, 'Invalid upload key.'),
  originalFilename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100),
  size: z.number().int().positive(),
  uploadToken: z.string().min(1),
  questionId: z.number().int().positive().nullable(),
});

export const saveAttemptSchema = z.object({
  /** False saves a draft and leaves the attempt open; true hands it in. */
  finalize: z.boolean(),
  answers: z.array(attemptAnswerSchema).max(200),
  /** Files uploaded during this attempt that are not recorded yet. */
  files: z.array(submissionFileSchema).max(100),
});

export type SaveAttemptInput = z.infer<typeof saveAttemptSchema>;
export type AttemptAnswerInput = z.infer<typeof attemptAnswerSchema>;
export type SubmissionFileInput = z.infer<typeof submissionFileSchema>;

export const submissionUploadTicketSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  size: z.number().int().positive(),
  contentType: z.string().trim().min(1).max(100),
  questionId: z.number().int().positive().nullable(),
});

export const deletePendingSubmissionFileSchema = submissionFileSchema;

/**
 * The browser form. Every answer is a string or a list of strings because that
 * is what the controls hold; whether one is *required* depends on the question,
 * so that check is `missingRequiredAnswers` rather than a schema rule, and a
 * half-finished draft has to stay saveable.
 */
export const attemptFormSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.number().int().positive(),
      choiceId: z.string(),
      choiceIds: z.array(z.string()),
      textAnswer: z.string().max(MAX_ANSWER_LENGTH, 'That answer is too long.'),
    }),
  ),
});

export type AttemptFormValues = z.infer<typeof attemptFormSchema>;
