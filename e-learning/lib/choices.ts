/**
 * Mirror of the shared Django choices in `src/core/constants.py` plus the
 * per-model ones this app needs.
 *
 * Django owns the schema, so these lists have to be kept in step by hand -- a
 * value that is not in the Django `choices` will fail model validation the next
 * time a staff member edits the row in the internal app.
 */

export const LEVELS = [
  'Mix Class',
  'Beginner 1',
  'Beginner 2',
  'Elementary 1',
  'Elementary 2',
  'Elementary 3',
  'Junior 1',
  'Junior 2',
  'Junior 3',
  'Senior 1',
  'Senior 2',
  'Senior 3',
] as const;

export type Level = (typeof LEVELS)[number];

/** study_materials.StudyMaterial.category / assignments.Assignment.category */
export const SUBJECT_CATEGORIES = [
  { value: 'reading', label: 'Reading' },
  { value: 'writing', label: 'Writing' },
  { value: 'listening', label: 'Listening' },
  { value: 'speaking', label: 'Speaking' },
] as const;

export type SubjectCategory = (typeof SUBJECT_CATEGORIES)[number]['value'];

/** study_materials.StudyMaterial.TYPE_CHOICES */
export const MATERIAL_TYPES = [
  { value: 'pdf', label: 'PDF document' },
  { value: 'video', label: 'Video' },
  { value: 'write_up', label: 'Write-up' },
] as const;

export type MaterialType = (typeof MATERIAL_TYPES)[number]['value'];

/** study_materials.StudyMaterial.STATUS_CHOICES */
export const MATERIAL_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
] as const;

export type MaterialStatus = (typeof MATERIAL_STATUSES)[number]['value'];

/**
 * assignments.Assignment.STATUS_CHOICES -- same three values as materials.
 *
 * An assignment has no kind of its own; each question carries its own type.
 */
export const ASSIGNMENT_STATUSES = MATERIAL_STATUSES;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number]['value'];

/**
 * Badge colours for the shared material/assignment status values. Kept here
 * because both the module and the assignment pages render the same three.
 */
const STATUS_BADGE_CLASS: Record<string, string> = {
  published: 'bg-accent-primary-soft text-accent-primary-strong',
  draft: 'bg-placeholder text-ink-soft',
  archived: 'bg-accent-warm-soft text-accent-warm-strong',
};

export function statusBadgeClass(status: string): string {
  return STATUS_BADGE_CLASS[status] ?? STATUS_BADGE_CLASS.draft;
}

/** assignments.Question.KIND_CHOICES */
export const QUESTION_KINDS = [
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'multi_select', label: 'Multi select' },
  { value: 'true_false', label: 'True / false' },
  { value: 'short_text', label: 'Short text' },
  { value: 'essay', label: 'Essay' },
  { value: 'file_upload', label: 'File upload' },
] as const;

export type QuestionKind = (typeof QUESTION_KINDS)[number]['value'];

/** assignments.Question.CHOICE_KINDS -- the kinds that carry choice rows. */
export const CHOICE_QUESTION_KINDS = [
  'multiple_choice',
  'multi_select',
  'true_false',
] as const;

/** assignments.Submission.STATUS_CHOICES */
export const SUBMISSION_STATUSES = [
  { value: 'in_progress', label: 'In progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'graded', label: 'Graded' },
  { value: 'returned', label: 'Returned' },
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]['value'];

/** core.constants.SEMESTER_CHOICES */
export const SEMESTERS = [
  { value: 'mid', label: 'MID' },
  { value: 'final', label: 'FINAL' },
] as const;

export type Semester = (typeof SEMESTERS)[number]['value'];

/** StudyMaterial.PDF_EXTENSIONS / VIDEO_EXTENSIONS */
export const PDF_EXTENSIONS = ['pdf'] as const;
export const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'm4v'] as const;

export const DAYS_SHORT: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

export function isLevel(value: string): value is Level {
  return (LEVELS as readonly string[]).includes(value);
}

export function isSubjectCategory(value: string): value is SubjectCategory {
  return SUBJECT_CATEGORIES.some((category) => category.value === value);
}

export function isMaterialType(value: string): value is MaterialType {
  return MATERIAL_TYPES.some((type) => type.value === value);
}

export function isMaterialStatus(value: string): value is MaterialStatus {
  return MATERIAL_STATUSES.some((status) => status.value === value);
}

export function isAssignmentStatus(value: string): value is AssignmentStatus {
  return ASSIGNMENT_STATUSES.some((status) => status.value === value);
}

export function isQuestionKind(value: string): value is QuestionKind {
  return QUESTION_KINDS.some((kind) => kind.value === value);
}

export function isSubmissionStatus(value: string): value is SubmissionStatus {
  return SUBMISSION_STATUSES.some((status) => status.value === value);
}

export function isSemester(value: string): value is Semester {
  return SEMESTERS.some((semester) => semester.value === value);
}

/** Mirrors `Question.has_choices` / `Question.is_auto_gradable`. */
export function questionHasChoices(kind: string): boolean {
  return (CHOICE_QUESTION_KINDS as readonly string[]).includes(kind);
}

/** The label a choice list uses, so the UI can say "options" or "answer". */
export function questionKindLabel(kind: string): string {
  return QUESTION_KINDS.find((option) => option.value === kind)?.label ?? kind;
}

export function submissionStatusLabel(status: string): string {
  return (
    SUBMISSION_STATUSES.find((option) => option.value === status)?.label ?? status
  );
}

/** The extensions a given material type accepts, empty for write-ups. */
export function allowedExtensions(type: MaterialType): readonly string[] {
  if (type === 'pdf') return PDF_EXTENSIONS;
  if (type === 'video') return VIDEO_EXTENSIONS;
  return [];
}

/** Mirrors `StudyMaterialForm.MAX_PDF_SIZE_MB` / `MAX_VIDEO_SIZE_MB`. */
export const MAX_PDF_SIZE_MB = 25;
export const MAX_VIDEO_SIZE_MB = 500;

export function maxUploadBytes(type: MaterialType): number {
  const megabytes = type === 'video' ? MAX_VIDEO_SIZE_MB : MAX_PDF_SIZE_MB;
  return megabytes * 1024 * 1024;
}

export function fileExtension(filename: string): string {
  if (!filename.includes('.')) return '';
  return filename.split('.').pop()!.toLowerCase();
}

/**
 * Checks a chosen file against the material type it is for. Runs in the browser
 * to fail fast and again in the upload action, which is the check that counts.
 */
export function validateUpload(
  type: MaterialType,
  filename: string,
  size: number,
): string | null {
  const permitted = allowedExtensions(type);
  if (permitted.length === 0) {
    return 'Write-up materials do not take a file.';
  }
  if (!permitted.includes(fileExtension(filename))) {
    return `${type === 'pdf' ? 'PDF' : 'Video'} materials must be ${permitted
      .map((extension) => `.${extension}`)
      .join(', ')}.`;
  }
  if (size <= 0) {
    return 'The selected file is empty.';
  }
  const limit = maxUploadBytes(type);
  if (size > limit) {
    return `The file size should not exceed ${limit / (1024 * 1024)}MB.`;
  }
  return null;
}
