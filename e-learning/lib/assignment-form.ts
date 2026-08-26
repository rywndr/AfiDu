/**
 * The mapping either side of the assignment form: the database row on the way
 * in, the API payload on the way out. Kept out of the components so the form
 * itself is only wiring, and so the payload is checked against the schema the
 * API validates it with.
 */
import type { UseFormReturn } from 'react-hook-form';

import {
  LEVELS,
  SUBJECT_CATEGORIES,
  isScoreYear,
  questionHasChoices,
} from '@/lib/choices';
import { dateTimeLocalToIso, formatScore, toDateTimeLocalValue } from '@/lib/format';
import type {
  AssignmentFormValues,
  AssignmentInput,
  QuestionFormValues,
  UploadedQuestionAudio,
} from '@/lib/form-schemas';
import type { EditableAssignment } from '@/lib/assignments';

/** What the sections of the form need from their parent. */
export type AssignmentSectionProps = {
  form: UseFormReturn<AssignmentFormValues>;
  disabled: boolean;
};

/** The default options a newly chosen question kind starts with. */
export function defaultChoices(kind: string): QuestionFormValues['choices'] {
  if (kind === 'true_false') {
    return [
      { text: 'True', isCorrect: true },
      { text: 'False', isCorrect: false },
    ];
  }
  if (questionHasChoices(kind)) {
    return [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
    ];
  }
  return [];
}

export function emptyQuestion(): QuestionFormValues {
  return {
    id: null,
    kind: 'multiple_choice',
    prompt: '',
    points: '1',
    explanation: '',
    isRequired: true,
    choices: defaultChoices('multiple_choice'),
    audio: null,
    hasAudio: false,
    audioUrl: null,
  };
}

export function toAssignmentFormValues(
  initial: EditableAssignment | undefined,
  suggestedLevel: string | null,
): AssignmentFormValues {
  const fallbackLevel = LEVELS.includes(suggestedLevel as (typeof LEVELS)[number])
    ? (suggestedLevel as (typeof LEVELS)[number])
    : LEVELS[0];
  const initialYear = initial?.year ? String(initial.year) : '';

  return {
    title: initial?.title ?? '',
    category: initial?.category ?? SUBJECT_CATEGORIES[0].value,
    level: initial?.level ?? fallbackLevel,
    status: initial?.status ?? 'draft',
    description: initial?.description ?? '',
    materialId: initial?.materialId ? String(initial.materialId) : '',
    year: isScoreYear(initialYear) ? initialYear : '',
    semester: initial?.semester ?? '',
    scoreTarget: initial?.scoreTarget ?? '',
    openAt: toDateTimeLocalValue(initial?.openAt),
    dueAt: toDateTimeLocalValue(initial?.dueAt),
    timeLimitMinutes: initial?.timeLimitMinutes ? String(initial.timeLimitMinutes) : '',
    maxAttempts: String(initial?.maxAttempts ?? 1),
    maxPoints: initial ? formatScore(initial.maxPoints) : '100',
    allowLate: initial?.allowLate ?? false,
    allowFileUpload: initial?.allowFileUpload ?? false,
    autoGrade: initial?.autoGrade ?? false,
    shuffleQuestions: initial?.shuffleQuestions ?? false,
    revealAnswersAfterSubmit: initial?.revealAnswersAfterSubmit ?? false,
    questions:
      initial?.questions.map((item) => ({
        id: item.id,
        kind: item.kind,
        prompt: item.prompt,
        points: formatScore(item.points),
        explanation: item.explanation,
        isRequired: item.isRequired,
        choices: item.choices.map((choice) => ({
          text: choice.text,
          isCorrect: choice.isCorrect,
        })),
        audio: null,
        hasAudio: item.hasAudio,
        audioUrl: item.audioUrl,
      })) ?? [],
  };
}

export function toAssignmentInput(
  classId: number,
  values: AssignmentFormValues,
  uploadedAudio: (UploadedQuestionAudio | null)[] = [],
): AssignmentInput {
  return {
    classId,
    title: values.title,
    category: values.category,
    level: values.level,
    status: values.status,
    description: values.description,
    materialId: values.materialId ? Number(values.materialId) : null,
    year: values.year ? Number(values.year) : null,
    semester: values.semester || null,
    scoreTarget: values.scoreTarget || null,
    // the inputs hold wall clock time; the API stores instants
    openAt: dateTimeLocalToIso(values.openAt) ?? '',
    dueAt: dateTimeLocalToIso(values.dueAt) ?? '',
    timeLimitMinutes: values.timeLimitMinutes ? Number(values.timeLimitMinutes) : null,
    maxAttempts: Number(values.maxAttempts),
    maxPoints: Number(values.maxPoints),
    allowLate: values.allowLate,
    allowFileUpload: values.allowFileUpload,
    autoGrade: values.autoGrade,
    shuffleQuestions: values.shuffleQuestions,
    revealAnswersAfterSubmit: values.revealAnswersAfterSubmit,
    questions: values.questions.map((item, index) => ({
      id: item.id,
      kind: item.kind,
      prompt: item.prompt,
      points: Number(item.points),
      explanation: item.explanation,
      isRequired: item.isRequired,
      choices: questionHasChoices(item.kind) ? item.choices : [],
      audio: uploadedAudio[index] ?? null,
    })),
  };
}
