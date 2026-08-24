/**
 * Assignment reads for the teacher assignment pages.
 *
 * Server-only and staff-facing. Django owns these tables, so anything written
 * back has to reproduce what its models do -- see `lib/assignment-mutations.ts`.
 *
 * Assignments are listed per class, the same way modules are: only rows whose
 * `student_class_id` is the class are shown. Level-wide assignments (a null
 * class) are created in the internal app and stay there.
 */
import 'server-only';

import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  assignment,
  question,
  questionChoice,
  student,
  studentClass,
  studyMaterial,
  submission,
  submissionAnswer,
  submissionAnswerChoice,
  submissionFile,
  user,
} from '@/db/schema';
import { isB2Configured, presignDownload } from '@/lib/b2';
import {
  isAssignmentStatus,
  isLevel,
  isQuestionKind,
  isSemester,
  isSubjectCategory,
  questionHasChoices,
  type AssignmentStatus,
  type Level,
  type QuestionKind,
  type Semester,
  type SubjectCategory,
} from '@/lib/choices';
import { recordingQuestionIdFromFilename } from '@/lib/recordings';

export type AssignmentClassSummary = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  days: string[];
  studentCount: number;
  assignmentCount: number;
  awaitingGradingCount: number;
};

export type AssignmentSummary = {
  id: number;
  title: string;
  description: string;
  category: string;
  level: string;
  status: string;
  openAt: Date | null;
  dueAt: Date | null;
  maxPoints: string;
  maxAttempts: number;
  timeLimitMinutes: number | null;
  allowLate: boolean;
  autoGrade: boolean;
  createdAt: Date;
  materialId: number | null;
  materialTitle: string | null;
  questionCount: number;
  submissionCount: number;
  awaitingGradingCount: number;
  gradedCount: number;
};

export type AssignmentPage = {
  items: AssignmentSummary[];
  total: number;
  allTotal: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type EditableChoice = {
  id: number;
  order: number;
  text: string;
  isCorrect: boolean;
};

export type EditableQuestion = {
  id: number;
  order: number;
  kind: QuestionKind;
  prompt: string;
  points: string;
  explanation: string;
  isRequired: boolean;
  hasAudio: boolean;
  audioUrl: string | null;
  choices: EditableChoice[];
};

export type EditableAssignment = {
  id: number;
  title: string;
  description: string;
  category: SubjectCategory;
  level: Level;
  status: AssignmentStatus;
  materialId: number | null;
  year: number | null;
  semester: Semester | null;
  openAt: Date | null;
  dueAt: Date | null;
  timeLimitMinutes: number | null;
  maxAttempts: number;
  allowLate: boolean;
  allowFileUpload: boolean;
  autoGrade: boolean;
  shuffleQuestions: boolean;
  revealAnswersAfterSubmit: boolean;
  maxPoints: string;
  questions: EditableQuestion[];
};

/** One row of the submission table on an assignment page. */
export type SubmissionRow = {
  studentId: number;
  studentName: string;
  studentLevel: string;
  inClass: boolean;
  submissionId: number | null;
  attemptNumber: number | null;
  attemptCount: number;
  status: string | null;
  submittedAt: Date | null;
  gradedAt: Date | null;
  isLate: boolean;
  autoScore: string | null;
  manualScore: string | null;
  totalScore: string | null;
  timeSpentSeconds: number | null;
};

export type AnswerDetail = {
  questionId: number;
  order: number;
  kind: string;
  prompt: string;
  points: string;
  explanation: string;
  isRequired: boolean;
  audioUrl: string | null;
  choices: (EditableChoice & { chosen: boolean })[];
  answerId: number | null;
  textAnswer: string;
  isCorrect: boolean | null;
  awardedPoints: string | null;
  feedback: string;
  files: SubmissionFileRef[];
  /** Choice questions are scored from the key; the rest need a human. */
  autoGradable: boolean;
};

export type SubmissionFileRef = {
  id: number;
  questionId: number | null;
  originalFilename: string;
  sizeBytes: number | null;
  mimeType: string;
  uploadedAt: Date;
  hasFile: boolean;
};

export type SubmissionDetail = {
  id: number;
  assignmentId: number;
  assignmentTitle: string;
  maxPoints: string;
  studentId: number;
  studentName: string;
  studentLevel: string;
  attemptNumber: number;
  attemptCount: number;
  status: string;
  startedAt: Date;
  submittedAt: Date | null;
  gradedAt: Date | null;
  gradedByName: string | null;
  timeSpentSeconds: number | null;
  autoScore: string | null;
  manualScore: string | null;
  totalScore: string | null;
  feedback: string;
  isLate: boolean;
  answers: AnswerDetail[];
  /** Uploads that answer the assignment as a whole rather than one question. */
  unattachedFiles: SubmissionFileRef[];
};

export type MaterialOption = {
  id: number;
  title: string;
  materialType: string;
  status: string;
};

const AWAITING_GRADING = 'submitted';

/** Every class, with the counts the class cards show. */
export async function listAssignmentClasses(): Promise<AssignmentClassSummary[]> {
  const [classes, studentCounts, assignmentCounts, pendingCounts] = await Promise.all([
    db
      .select({
        id: studentClass.id,
        name: studentClass.name,
        startTime: studentClass.startTime,
        endTime: studentClass.endTime,
        days: studentClass.days,
      })
      .from(studentClass)
      .orderBy(asc(studentClass.name)),
    db
      .select({ classId: student.assignedClassId, total: count() })
      .from(student)
      .groupBy(student.assignedClassId),
    db
      .select({ classId: assignment.studentClassId, total: count() })
      .from(assignment)
      .groupBy(assignment.studentClassId),
    db
      .select({ classId: assignment.studentClassId, total: count() })
      .from(submission)
      .innerJoin(assignment, eq(submission.assignmentId, assignment.id))
      .where(eq(submission.status, AWAITING_GRADING))
      .groupBy(assignment.studentClassId),
  ]);

  const students = new Map(studentCounts.map((row) => [row.classId, row.total]));
  const assignments = new Map(assignmentCounts.map((row) => [row.classId, row.total]));
  const pending = new Map(pendingCounts.map((row) => [row.classId, row.total]));

  return classes.map((row) => ({
    ...row,
    days: row.days ?? [],
    studentCount: students.get(row.id) ?? 0,
    assignmentCount: assignments.get(row.id) ?? 0,
    awaitingGradingCount: pending.get(row.id) ?? 0,
  }));
}

/** Assignments targeted at one class, newest first, with their roll-up counts. */
export async function listClassAssignments(
  classId: number,
  options: {
    query?: string;
    category?: SubjectCategory;
    status?: AssignmentStatus;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<AssignmentPage> {
  const query = options.query?.trim().slice(0, 100) ?? '';
  const pageSize = Math.min(Math.max(options.pageSize ?? 6, 1), 50);
  const requestedPage = Math.max(options.page ?? 1, 1);
  const filters = [eq(assignment.studentClassId, classId)];

  if (query) {
    const escapedQuery = query.replace(/[\\%_]/g, '\\$&');
    const pattern = `%${escapedQuery}%`;
    filters.push(
      or(ilike(assignment.title, pattern), ilike(assignment.description, pattern))!,
    );
  }
  if (options.category) {
    filters.push(eq(assignment.category, options.category));
  }
  if (options.status) {
    filters.push(eq(assignment.status, options.status));
  }

  const where = and(...filters);
  const [[filteredCount], [classCount]] = await Promise.all([
    db.select({ total: count() }).from(assignment).where(where),
    db
      .select({ total: count() })
      .from(assignment)
      .where(eq(assignment.studentClassId, classId)),
  ]);
  const total = filteredCount?.total ?? 0;
  const allTotal = classCount?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const rows = await db
    .select({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      category: assignment.category,
      level: assignment.level,
      status: assignment.status,
      openAt: assignment.openAt,
      dueAt: assignment.dueAt,
      maxPoints: assignment.maxPoints,
      maxAttempts: assignment.maxAttempts,
      timeLimitMinutes: assignment.timeLimitMinutes,
      allowLate: assignment.allowLate,
      autoGrade: assignment.autoGrade,
      createdAt: assignment.createdAt,
      materialId: assignment.materialId,
      materialTitle: studyMaterial.title,
    })
    .from(assignment)
    .leftJoin(studyMaterial, eq(assignment.materialId, studyMaterial.id))
    .where(where)
    .orderBy(desc(assignment.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  if (rows.length === 0) {
    return { items: [], total, allTotal, page, pageSize, totalPages };
  }

  const ids = rows.map((row) => row.id);
  const [questionCounts, submissionCounts] = await Promise.all([
    db
      .select({ assignmentId: question.assignmentId, total: count() })
      .from(question)
      .where(inArray(question.assignmentId, ids))
      .groupBy(question.assignmentId),
    db
      .select({
        assignmentId: submission.assignmentId,
        status: submission.status,
        total: count(),
      })
      .from(submission)
      .where(inArray(submission.assignmentId, ids))
      .groupBy(submission.assignmentId, submission.status),
  ]);

  const questions = new Map(questionCounts.map((row) => [row.assignmentId, row.total]));
  const submissions = new Map<
    number,
    { total: number; awaiting: number; graded: number }
  >();
  for (const row of submissionCounts) {
    const bucket = submissions.get(row.assignmentId) ?? {
      total: 0,
      awaiting: 0,
      graded: 0,
    };
    bucket.total += row.total;
    if (row.status === AWAITING_GRADING) bucket.awaiting += row.total;
    if (row.status === 'graded' || row.status === 'returned') {
      bucket.graded += row.total;
    }
    submissions.set(row.assignmentId, bucket);
  }

  const items = rows.map((row) => {
    const counts = submissions.get(row.id);
    return {
      ...row,
      questionCount: questions.get(row.id) ?? 0,
      submissionCount: counts?.total ?? 0,
      awaitingGradingCount: counts?.awaiting ?? 0,
      gradedCount: counts?.graded ?? 0,
    };
  });

  return { items, total, allTotal, page, pageSize, totalPages };
}

/** One assignment scoped to its class, or null when it belongs elsewhere. */
export async function getAssignmentDetail(
  classId: number,
  assignmentId: number,
): Promise<AssignmentSummary | null> {
  const [row] = await db
    .select({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      category: assignment.category,
      level: assignment.level,
      status: assignment.status,
      openAt: assignment.openAt,
      dueAt: assignment.dueAt,
      maxPoints: assignment.maxPoints,
      maxAttempts: assignment.maxAttempts,
      timeLimitMinutes: assignment.timeLimitMinutes,
      allowLate: assignment.allowLate,
      autoGrade: assignment.autoGrade,
      createdAt: assignment.createdAt,
      materialId: assignment.materialId,
      materialTitle: studyMaterial.title,
    })
    .from(assignment)
    .leftJoin(studyMaterial, eq(assignment.materialId, studyMaterial.id))
    .where(
      and(eq(assignment.id, assignmentId), eq(assignment.studentClassId, classId)),
    )
    .limit(1);

  if (!row) return null;

  const [questionCounts, submissionCounts] = await Promise.all([
    db
      .select({ total: count() })
      .from(question)
      .where(eq(question.assignmentId, assignmentId)),
    db
      .select({ status: submission.status, total: count() })
      .from(submission)
      .where(eq(submission.assignmentId, assignmentId))
      .groupBy(submission.status),
  ]);

  let submissionCount = 0;
  let awaitingGradingCount = 0;
  let gradedCount = 0;
  for (const bucket of submissionCounts) {
    submissionCount += bucket.total;
    if (bucket.status === AWAITING_GRADING) awaitingGradingCount += bucket.total;
    if (bucket.status === 'graded' || bucket.status === 'returned') {
      gradedCount += bucket.total;
    }
  }

  return {
    ...row,
    questionCount: questionCounts[0]?.total ?? 0,
    submissionCount,
    awaitingGradingCount,
    gradedCount,
  };
}

/** The assignment as the create/edit form needs it, questions included. */
export async function getEditableAssignment(
  classId: number,
  assignmentId: number,
): Promise<EditableAssignment | null> {
  const [row] = await db
    .select({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      category: assignment.category,
      level: assignment.level,
      status: assignment.status,
      materialId: assignment.materialId,
      year: assignment.year,
      semester: assignment.semester,
      openAt: assignment.openAt,
      dueAt: assignment.dueAt,
      timeLimitMinutes: assignment.timeLimitMinutes,
      maxAttempts: assignment.maxAttempts,
      allowLate: assignment.allowLate,
      allowFileUpload: assignment.allowFileUpload,
      autoGrade: assignment.autoGrade,
      shuffleQuestions: assignment.shuffleQuestions,
      revealAnswersAfterSubmit: assignment.revealAnswersAfterSubmit,
      maxPoints: assignment.maxPoints,
    })
    .from(assignment)
    .where(
      and(eq(assignment.id, assignmentId), eq(assignment.studentClassId, classId)),
    )
    .limit(1);

  if (
    !row ||
    !isSubjectCategory(row.category) ||
    !isLevel(row.level) ||
    !isAssignmentStatus(row.status)
  ) {
    return null;
  }

  return {
    ...row,
    category: row.category,
    level: row.level,
    status: row.status,
    semester: row.semester && isSemester(row.semester) ? row.semester : null,
    questions: await listQuestions(assignmentId),
  };
}

/** Questions with their choices, in the order students see them. */
export async function listQuestions(
  assignmentId: number,
): Promise<EditableQuestion[]> {
  const rows = await db
    .select({
      id: question.id,
      order: question.order,
      kind: question.kind,
      prompt: question.prompt,
      audio: question.audio,
      points: question.points,
      explanation: question.explanation,
      isRequired: question.isRequired,
    })
    .from(question)
    .where(eq(question.assignmentId, assignmentId))
    .orderBy(asc(question.order), asc(question.id));

  if (rows.length === 0) return [];

  const choices = await db
    .select({
      id: questionChoice.id,
      questionId: questionChoice.questionId,
      order: questionChoice.order,
      text: questionChoice.text,
      isCorrect: questionChoice.isCorrect,
    })
    .from(questionChoice)
    .where(
      inArray(
        questionChoice.questionId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(questionChoice.order), asc(questionChoice.id));

  const byQuestion = new Map<number, EditableChoice[]>();
  for (const { questionId, ...choice } of choices) {
    const existing = byQuestion.get(questionId);
    if (existing) existing.push(choice);
    else byQuestion.set(questionId, [choice]);
  }

  // A kind Django knows about but this app does not would break the editor, so
  // it is normalised to the closest free-text kind rather than dropped.
  const storageReady = isB2Configured();
  return Promise.all(
    rows.map(async ({ audio, ...row }) => ({
      ...row,
      kind: isQuestionKind(row.kind) ? row.kind : 'short_text',
      hasAudio: Boolean(audio),
      audioUrl:
        audio && storageReady ? await presignDownload(audio) : null,
      choices: byQuestion.get(row.id) ?? [],
    })),
  );
}

/**
 * The class roster with each student's latest attempt.
 *
 * Students who have not started appear with a null submission, and a student who
 * has since moved class still shows if they submitted, flagged `inClass: false`.
 */
export async function listAssignmentSubmissions(
  classId: number,
  assignmentId: number,
): Promise<SubmissionRow[]> {
  const [roster, submissions] = await Promise.all([
    db
      .select({ id: student.id, name: student.name, level: student.level })
      .from(student)
      .where(eq(student.assignedClassId, classId))
      .orderBy(asc(student.name)),
    db
      .select({
        id: submission.id,
        studentId: submission.studentId,
        studentName: student.name,
        studentLevel: student.level,
        attemptNumber: submission.attemptNumber,
        status: submission.status,
        submittedAt: submission.submittedAt,
        gradedAt: submission.gradedAt,
        isLate: submission.isLate,
        autoScore: submission.autoScore,
        manualScore: submission.manualScore,
        totalScore: submission.totalScore,
        timeSpentSeconds: submission.timeSpentSeconds,
      })
      .from(submission)
      .innerJoin(student, eq(submission.studentId, student.id))
      .where(eq(submission.assignmentId, assignmentId))
      .orderBy(asc(submission.studentId), desc(submission.attemptNumber)),
  ]);

  const latest = new Map<number, (typeof submissions)[number]>();
  const attempts = new Map<number, number>();
  for (const row of submissions) {
    // ordered by attempt descending, so the first row per student is the latest
    if (!latest.has(row.studentId)) latest.set(row.studentId, row);
    attempts.set(row.studentId, (attempts.get(row.studentId) ?? 0) + 1);
  }

  const rosterIds = new Set(roster.map((row) => row.id));
  const fromRoster: SubmissionRow[] = roster.map((row) => {
    const current = latest.get(row.id);
    return {
      studentId: row.id,
      studentName: row.name,
      studentLevel: row.level,
      inClass: true,
      submissionId: current?.id ?? null,
      attemptNumber: current?.attemptNumber ?? null,
      attemptCount: attempts.get(row.id) ?? 0,
      status: current?.status ?? null,
      submittedAt: current?.submittedAt ?? null,
      gradedAt: current?.gradedAt ?? null,
      isLate: current?.isLate ?? false,
      autoScore: current?.autoScore ?? null,
      manualScore: current?.manualScore ?? null,
      totalScore: current?.totalScore ?? null,
      timeSpentSeconds: current?.timeSpentSeconds ?? null,
    };
  });

  const others: SubmissionRow[] = [...latest.values()]
    .filter((row) => !rosterIds.has(row.studentId))
    .sort((a, b) => a.studentName.localeCompare(b.studentName))
    .map((row) => ({
      studentId: row.studentId,
      studentName: row.studentName,
      studentLevel: row.studentLevel,
      inClass: false,
      submissionId: row.id,
      attemptNumber: row.attemptNumber,
      attemptCount: attempts.get(row.studentId) ?? 1,
      status: row.status,
      submittedAt: row.submittedAt,
      gradedAt: row.gradedAt,
      isLate: row.isLate,
      autoScore: row.autoScore,
      manualScore: row.manualScore,
      totalScore: row.totalScore,
      timeSpentSeconds: row.timeSpentSeconds,
    }));

  return [...fromRoster, ...others];
}

/**
 * One attempt with every question, answered or not, plus its uploads.
 *
 * `assignmentId` is passed so a submission id from another assignment cannot be
 * opened by editing the URL.
 */
export async function getSubmissionDetail(
  assignmentId: number,
  submissionId: number,
): Promise<SubmissionDetail | null> {
  const [row] = await db
    .select({
      id: submission.id,
      assignmentId: submission.assignmentId,
      assignmentTitle: assignment.title,
      maxPoints: assignment.maxPoints,
      studentId: submission.studentId,
      studentName: student.name,
      studentLevel: student.level,
      attemptNumber: submission.attemptNumber,
      status: submission.status,
      startedAt: submission.startedAt,
      submittedAt: submission.submittedAt,
      gradedAt: submission.gradedAt,
      graderFirstName: user.first_name,
      graderLastName: user.last_name,
      graderEmail: user.email,
      timeSpentSeconds: submission.timeSpentSeconds,
      autoScore: submission.autoScore,
      manualScore: submission.manualScore,
      totalScore: submission.totalScore,
      feedback: submission.feedback,
      isLate: submission.isLate,
    })
    .from(submission)
    .innerJoin(assignment, eq(submission.assignmentId, assignment.id))
    .innerJoin(student, eq(submission.studentId, student.id))
    .leftJoin(user, eq(submission.gradedById, user.id))
    .where(
      and(eq(submission.id, submissionId), eq(submission.assignmentId, assignmentId)),
    )
    .limit(1);

  if (!row) return null;

  const { graderFirstName, graderLastName, graderEmail, ...submissionRow } = row;
  const gradedByName =
    [graderFirstName, graderLastName].filter(Boolean).join(' ').trim() ||
    graderEmail ||
    null;

  const [questions, answers, files, attemptCount] = await Promise.all([
    listQuestions(assignmentId),
    db
      .select({
        id: submissionAnswer.id,
        questionId: submissionAnswer.questionId,
        selectedChoiceId: submissionAnswer.selectedChoiceId,
        textAnswer: submissionAnswer.textAnswer,
        isCorrect: submissionAnswer.isCorrect,
        awardedPoints: submissionAnswer.awardedPoints,
        feedback: submissionAnswer.feedback,
      })
      .from(submissionAnswer)
      .where(eq(submissionAnswer.submissionId, submissionId)),
    db
      .select({
        id: submissionFile.id,
        questionId: submissionFile.questionId,
        file: submissionFile.file,
        originalFilename: submissionFile.originalFilename,
        sizeBytes: submissionFile.sizeBytes,
        mimeType: submissionFile.mimeType,
        uploadedAt: submissionFile.uploadedAt,
      })
      .from(submissionFile)
      .where(eq(submissionFile.submissionId, submissionId))
      .orderBy(desc(submissionFile.uploadedAt)),
    db
      .select({ total: count() })
      .from(submission)
      .where(
        and(
          eq(submission.assignmentId, assignmentId),
          eq(submission.studentId, row.studentId),
        ),
      ),
  ]);

  const answerIds = answers.map((answer) => answer.id);
  const multiChoices = answerIds.length
    ? await db
        .select({
          answerId: submissionAnswerChoice.submissionAnswerId,
          choiceId: submissionAnswerChoice.questionChoiceId,
        })
        .from(submissionAnswerChoice)
        .where(inArray(submissionAnswerChoice.submissionAnswerId, answerIds))
    : [];

  const chosenByAnswer = new Map<number, Set<number>>();
  for (const link of multiChoices) {
    const existing = chosenByAnswer.get(link.answerId);
    if (existing) existing.add(link.choiceId);
    else chosenByAnswer.set(link.answerId, new Set([link.choiceId]));
  }

  const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
  const filesByQuestion = new Map<number, SubmissionFileRef[]>();
  const unattachedFiles: SubmissionFileRef[] = [];
  const validQuestionIds = new Set(questions.map((item) => item.id));
  for (const { questionId, file, ...meta } of files) {
    const inferredQuestionId = recordingQuestionIdFromFilename(meta.originalFilename);
    const linkedQuestionId =
      questionId ??
      (inferredQuestionId !== null && validQuestionIds.has(inferredQuestionId)
        ? inferredQuestionId
        : null);
    const ref: SubmissionFileRef = {
      ...meta,
      questionId: linkedQuestionId,
      hasFile: Boolean(file),
    };
    if (linkedQuestionId === null) {
      unattachedFiles.push(ref);
      continue;
    }
    const existing = filesByQuestion.get(linkedQuestionId);
    if (existing) existing.push(ref);
    else filesByQuestion.set(linkedQuestionId, [ref]);
  }

  const answerDetails: AnswerDetail[] = questions.map((item) => {
    const answer = answerByQuestion.get(item.id);
    const chosen = answer ? chosenByAnswer.get(answer.id) : undefined;

    return {
      questionId: item.id,
      order: item.order,
      kind: item.kind,
      prompt: item.prompt,
      points: item.points,
      explanation: item.explanation,
      isRequired: item.isRequired,
      audioUrl: item.audioUrl,
      choices: item.choices.map((choice) => ({
        ...choice,
        chosen:
          answer?.selectedChoiceId === choice.id || (chosen?.has(choice.id) ?? false),
      })),
      answerId: answer?.id ?? null,
      textAnswer: answer?.textAnswer ?? '',
      isCorrect: answer?.isCorrect ?? null,
      awardedPoints: answer?.awardedPoints ?? null,
      feedback: answer?.feedback ?? '',
      files: filesByQuestion.get(item.id) ?? [],
      autoGradable: questionHasChoices(item.kind),
    };
  });

  return {
    ...submissionRow,
    attemptCount: attemptCount[0]?.total ?? 1,
    gradedByName,
    answers: answerDetails,
    unattachedFiles,
  };
}

/** Published or draft materials of this class, for the reference-material select. */
export async function listClassMaterialOptions(
  classId: number,
): Promise<MaterialOption[]> {
  return db
    .select({
      id: studyMaterial.id,
      title: studyMaterial.title,
      materialType: studyMaterial.materialType,
      status: studyMaterial.status,
    })
    .from(studyMaterial)
    .where(eq(studyMaterial.studentClassId, classId))
    .orderBy(asc(studyMaterial.position), desc(studyMaterial.uploadedAt));
}

/** Django's `slugify`: strip accents, keep word characters, collapse to dashes. */
function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Mirror of `Assignment._build_slug`. Not race-free -- neither is Django's --
 * but the column is unique, so a collision fails the insert rather than
 * producing duplicate slugs.
 */
export async function buildAssignmentSlug(title: string): Promise<string> {
  const base = slugify(title).slice(0, 250) || 'assignment';
  const taken = await db
    .select({ slug: assignment.slug })
    .from(assignment)
    .where(sql`${assignment.slug} = ${base} or ${assignment.slug} like ${`${base}-%`}`);

  const used = new Set(taken.map((row) => row.slug));
  if (!used.has(base)) return base;

  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
