/**
 * Drizzle mappings for the tables better-auth needs.
 *
 * The Django app in `../src` owns this schema -- these definitions must mirror
 * the models in `src/login/models.py`, they do not create anything. Run the
 * Django migrations, never `drizzle-kit push`, to change the shape of these
 * tables.
 *
 * The property names below are deliberately the *database* column names rather
 * than camelCase: better-auth's drizzle adapter looks columns up by the DB field
 * name it resolves from `lib/auth.ts` (`schemaModel[dbFieldName]`), so a
 * camelCase key here makes the lookup silently miss.
 */
import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

/** Django: login.CustomUser */
export const user = pgTable('login_customuser', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  first_name: varchar('first_name', { length: 30 }).notNull(),
  last_name: varchar('last_name', { length: 30 }).notNull(),
  email_verified: boolean('email_verified').notNull().default(false),
  image: varchar('image', { length: 500 }).notNull().default(''),
  role: varchar('role', { length: 20 }).notNull().default('teacher'),
  is_active: boolean('is_active').notNull().default(true),
  is_staff: boolean('is_staff').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

/** Django: login.AuthAccount -- holds the credential hash */
export const account = pgTable('auth_account', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  provider_id: varchar('provider_id', { length: 100 }).notNull(),
  account_id: varchar('account_id', { length: 255 }).notNull(),
  // better-auth 1.7 matches credential accounts on issuer === 'local:credential'
  issuer: varchar('issuer', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }).notNull().default(''),
  access_token: text('access_token'),
  refresh_token: text('refresh_token'),
  id_token: text('id_token'),
  access_token_expires_at: timestamp('access_token_expires_at', {
    withTimezone: true,
  }),
  refresh_token_expires_at: timestamp('refresh_token_expires_at', {
    withTimezone: true,
  }),
  scope: text('scope'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
});

/** Django: login.AuthSession */
export const session = pgTable('auth_session', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
});

/** Django: login.AuthVerification */
export const verification = pgTable('auth_verification', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  value: text('value').notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
});

/**
 * Django: students.Student -- the learner record a student login points at.
 * Not part of the better-auth schema; queried directly by the app, so plain
 * camelCase keys are fine here.
 */
export const student = pgTable('students_student', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  level: varchar('level', { length: 20 }).notNull(),
  email: varchar('email', { length: 254 }).notNull().default(''),
  assignedClassId: bigint('assigned_class_id', { mode: 'number' }),
  userId: bigint('user_id', { mode: 'number' }),
});

/** Django: students.StudentClass */
export const studentClass = pgTable('students_studentclass', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description').notNull(),
  startTime: time('start_time').notNull(),
  endTime: time('end_time').notNull(),
  maxStudents: integer('max_students').notNull().default(20),
  days: jsonb('days').$type<string[]>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

/**
 * Django: study_materials.StudyMaterial.
 *
 * `file` and `thumbnail` contain Django storage object names, not permanent
 * public URLs. Private B2 URLs must be signed when they are rendered.
 */
export const studyMaterial = pgTable(
  'study_materials_studymaterial',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 280 }).notNull().unique(),
    description: text('description').notNull(),
    materialType: varchar('material_type', { length: 20 })
      .notNull()
      .default('pdf'),
    content: text('content').notNull(),
    category: varchar('category', { length: 20 }).notNull(),
    level: varchar('level', { length: 20 }).notNull(),
    studentClassId: bigint('student_class_id', { mode: 'number' }).references(
      () => studentClass.id,
      { onDelete: 'set null' },
    ),
    file: varchar('file', { length: 100 }).notNull(),
    thumbnail: varchar('thumbnail', { length: 100 }),
    originalFilename: varchar('original_filename', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }),
    pageCount: integer('page_count'),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    position: integer('position').notNull().default(0),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull(),
    editedAt: timestamp('edited_at', { withTimezone: true }).notNull(),
    uploadedById: bigint('uploaded_by_id', { mode: 'number' }).references(
      () => user.id,
      { onDelete: 'cascade' },
    ),
  },
  (table) => [
    index('study_material_visible_idx').on(
      table.status,
      table.level,
      table.category,
    ),
    index('study_material_position_idx').on(table.position),
  ],
);

/**
 * Django: assignments.Assignment.
 *
 * `materialId` is the link a study material is attached through: the FK lives on
 * this side, so one material can back several assignments but an assignment
 * references at most one material.
 */
export const assignment = pgTable(
  'assignments_assignment',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 280 }).notNull().unique(),
    description: text('description').notNull(),
    category: varchar('category', { length: 20 }).notNull(),
    level: varchar('level', { length: 20 }).notNull(),
    studentClassId: bigint('student_class_id', { mode: 'number' }).references(
      () => studentClass.id,
      { onDelete: 'set null' },
    ),
    materialId: bigint('material_id', { mode: 'number' }).references(
      () => studyMaterial.id,
      { onDelete: 'set null' },
    ),
    year: integer('year'),
    semester: varchar('semester', { length: 5 }),
    scoreTarget: varchar('score_target', { length: 11 }),
    createdById: bigint('created_by_id', { mode: 'number' }).references(
      () => user.id,
      { onDelete: 'set null' },
    ),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    openAt: timestamp('open_at', { withTimezone: true }),
    dueAt: timestamp('due_at', { withTimezone: true }),
    timeLimitMinutes: integer('time_limit_minutes'),
    maxAttempts: smallint('max_attempts').notNull().default(1),
    allowLate: boolean('allow_late').notNull().default(false),
    allowFileUpload: boolean('allow_file_upload').notNull().default(false),
    autoGrade: boolean('auto_grade').notNull().default(false),
    shuffleQuestions: boolean('shuffle_questions').notNull().default(false),
    revealAnswersAfterSubmit: boolean('reveal_answers_after_submit')
      .notNull()
      .default(false),
    maxPoints: numeric('max_points', { precision: 6, scale: 2 })
      .notNull()
      .default('100.00'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('assignment_visible_idx').on(table.status, table.level, table.category),
    index('assignment_due_idx').on(table.dueAt),
  ],
);

/** Django: scores.ScoreConfig */
export const scoreConfig = pgTable('scores_scoreconfig', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  year: integer('year'),
  semester: varchar('semester', { length: 5 }),
  category: varchar('category', { length: 10 }),
  numExercises: integer('num_exercises').notNull().default(5),
  formula: text('formula').notNull(),
});

/** Django: scores.Score */
export const score = pgTable(
  'scores_score',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    studentId: bigint('student_id', { mode: 'number' })
      .notNull()
      .references(() => student.id),
    year: integer('year').notNull(),
    semester: varchar('semester', { length: 5 }).notNull(),
    category: varchar('category', { length: 10 }).notNull(),
    legacyExerciseScores: jsonb('legacy_exercise_scores').notNull().default([]),
    midTerm: numeric('mid_term', { precision: 5, scale: 2 }),
    midTermSource: varchar('mid_term_source', { length: 20 })
      .notNull()
      .default('manual'),
    midTermAssignmentId: bigint('mid_term_assignment_id', {
      mode: 'number',
    }).references(() => assignment.id, { onDelete: 'set null' }),
    midTermNote: varchar('mid_term_note', { length: 255 }).notNull().default(''),
    finals: numeric('finals', { precision: 5, scale: 2 }),
    finalsSource: varchar('finals_source', { length: 20 })
      .notNull()
      .default('manual'),
    finalsAssignmentId: bigint('finals_assignment_id', {
      mode: 'number',
    }).references(() => assignment.id, { onDelete: 'set null' }),
    finalsNote: varchar('finals_note', { length: 255 }).notNull().default(''),
  },
  (table) => [
    uniqueIndex('score_student_period_category_uniq').on(
      table.studentId,
      table.year,
      table.semester,
      table.category,
    ),
    index('score_period_idx').on(table.year, table.semester, table.category),
  ],
);

/**
 * Django: assignments.Question.
 *
 * `order` is unique per assignment, so rewriting a question list has to avoid
 * transient collisions -- see `replaceQuestions` in `lib/assignment-mutations.ts`.
 */
export const question = pgTable('assignments_question', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  assignmentId: bigint('assignment_id', { mode: 'number' })
    .notNull()
    .references(() => assignment.id, { onDelete: 'cascade' }),
  order: smallint('order').notNull().default(1),
  kind: varchar('kind', { length: 20 }).notNull().default('multiple_choice'),
  prompt: text('prompt').notNull(),
  audio: varchar('audio', { length: 100 }).notNull().default(''),
  points: numeric('points', { precision: 6, scale: 2 }).notNull().default('1.00'),
  explanation: text('explanation').notNull(),
  isRequired: boolean('is_required').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

/** Django: assignments.QuestionChoice */
export const questionChoice = pgTable('assignments_questionchoice', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  questionId: bigint('question_id', { mode: 'number' })
    .notNull()
    .references(() => question.id, { onDelete: 'cascade' }),
  order: smallint('order').notNull().default(1),
  text: varchar('text', { length: 500 }).notNull(),
  isCorrect: boolean('is_correct').notNull().default(false),
});

/**
 * Django: assignments.Submission -- one attempt at an assignment.
 *
 * `totalScore` is `autoScore + manualScore`, kept denormalised by Django's
 * `recalculate_total()`; grading from this app has to maintain it too.
 */
export const submission = pgTable(
  'assignments_submission',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    assignmentId: bigint('assignment_id', { mode: 'number' })
      .notNull()
      .references(() => assignment.id, { onDelete: 'cascade' }),
    studentId: bigint('student_id', { mode: 'number' })
      .notNull()
      .references(() => student.id, { onDelete: 'cascade' }),
    attemptNumber: smallint('attempt_number').notNull().default(1),
    status: varchar('status', { length: 20 }).notNull().default('in_progress'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    gradedAt: timestamp('graded_at', { withTimezone: true }),
    gradedById: bigint('graded_by_id', { mode: 'number' }).references(
      () => user.id,
      { onDelete: 'set null' },
    ),
    timeSpentSeconds: integer('time_spent_seconds'),
    autoScore: numeric('auto_score', { precision: 6, scale: 2 }),
    manualScore: numeric('manual_score', { precision: 6, scale: 2 }),
    totalScore: numeric('total_score', { precision: 6, scale: 2 }),
    feedback: text('feedback').notNull(),
    isLate: boolean('is_late').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('submission_asg_status_idx').on(table.assignmentId, table.status),
    index('submission_stu_status_idx').on(table.studentId, table.status),
  ],
);

/** Django: scores.ScoreEntry */
export const scoreEntry = pgTable(
  'scores_scoreentry',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    scoreId: bigint('score_id', { mode: 'number' })
      .notNull()
      .references(() => score.id),
    slot: smallint('slot').notNull(),
    points: numeric('points', { precision: 5, scale: 2 }),
    source: varchar('source', { length: 20 }).notNull().default('manual'),
    assignmentId: bigint('assignment_id', { mode: 'number' }).references(
      () => assignment.id,
    ),
    submissionId: bigint('submission_id', { mode: 'number' }).references(
      () => submission.id,
    ),
    note: varchar('note', { length: 255 }).notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('score_entry_slot_uniq').on(table.scoreId, table.slot),
  ],
);

/** Django: assignments.SubmissionAnswer */
export const submissionAnswer = pgTable('assignments_submissionanswer', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  submissionId: bigint('submission_id', { mode: 'number' })
    .notNull()
    .references(() => submission.id, { onDelete: 'cascade' }),
  questionId: bigint('question_id', { mode: 'number' })
    .notNull()
    .references(() => question.id, { onDelete: 'cascade' }),
  selectedChoiceId: bigint('selected_choice_id', { mode: 'number' }).references(
    () => questionChoice.id,
    { onDelete: 'set null' },
  ),
  textAnswer: text('text_answer').notNull(),
  isCorrect: boolean('is_correct'),
  awardedPoints: numeric('awarded_points', { precision: 6, scale: 2 }),
  feedback: text('feedback').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

/**
 * Django's implicit through table for `SubmissionAnswer.selected_choices`, used
 * by multi-select questions. Column names are the ones Django generates.
 */
export const submissionAnswerChoice = pgTable(
  'assignments_submissionanswer_selected_choices',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    submissionAnswerId: bigint('submissionanswer_id', { mode: 'number' })
      .notNull()
      .references(() => submissionAnswer.id, { onDelete: 'cascade' }),
    questionChoiceId: bigint('questionchoice_id', { mode: 'number' })
      .notNull()
      .references(() => questionChoice.id, { onDelete: 'cascade' }),
  },
);

/** Django: assignments.SubmissionFile -- `file` is a storage key, not a URL. */
export const submissionFile = pgTable(
  'assignments_submissionfile',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    submissionId: bigint('submission_id', { mode: 'number' })
      .notNull()
      .references(() => submission.id, { onDelete: 'cascade' }),
    questionId: bigint('question_id', { mode: 'number' }).references(
      () => question.id,
      { onDelete: 'set null' },
    ),
    file: varchar('file', { length: 100 }).notNull(),
    originalFilename: varchar('original_filename', { length: 255 }).notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull(),
  },
  (table) => [index('submission_file_sub_idx').on(table.submissionId)],
);

export const schema = {
  user,
  account,
  session,
  verification,
  student,
  studentClass,
  studyMaterial,
  assignment,
  question,
  questionChoice,
  submission,
  submissionAnswer,
  submissionAnswerChoice,
  submissionFile,
};
