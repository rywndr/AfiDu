import 'server-only';

import { and, count, eq, gt, isNull } from 'drizzle-orm';

import { db } from '@/db';
import {
  submission,
  submissionFile,
  submissionUploadTicket,
} from '@/db/schema';
import { MAX_SUBMISSION_FILES } from '@/lib/choices';
import type { SubmissionFileInput } from '@/lib/form-schemas';
import {
  UPLOAD_TOKEN_TTL_MS,
  type SubmissionUploadTokenPayload,
} from '@/lib/upload-token';

const TICKET_RATE_WINDOW_MS = 10 * 60 * 1000;
const TICKET_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_TICKETS_PER_STUDENT_WINDOW = 20;
const MAX_TICKETS_PER_STUDENT_DAY = 50;

export type TicketGrant =
  | { kind: 'granted'; ticketId: number }
  | { kind: 'attempt-full' }
  | { kind: 'rate-limited'; retryAfterSeconds: number };

/**
 * Persist every ticket so limits work across Vercel instances. Expired tickets
 * remain as a short audit trail but no longer reserve an upload slot.
 */
export async function grantSubmissionUploadTicket(input: {
  studentId: number;
  submissionId: number;
  questionId: number | null;
  key: string;
  originalFilename: string;
  expectedSize: number;
  mimeType: string;
}): Promise<TicketGrant> {
  const now = new Date();
  const rateWindowStart = new Date(now.getTime() - TICKET_RATE_WINDOW_MS);
  const dailyWindowStart = new Date(now.getTime() - TICKET_DAILY_WINDOW_MS);
  const activeSince = new Date(now.getTime() - UPLOAD_TOKEN_TTL_MS);

  const [recentResult, dailyResult, storedFiles, activeTickets] = await Promise.all([
    db
      .select({ total: count() })
      .from(submissionUploadTicket)
      .innerJoin(
        submission,
        eq(submissionUploadTicket.submissionId, submission.id),
      )
      .where(
        and(
          eq(submission.studentId, input.studentId),
          gt(submissionUploadTicket.createdAt, rateWindowStart),
        ),
      ),
    db
      .select({ total: count() })
      .from(submissionUploadTicket)
      .innerJoin(
        submission,
        eq(submissionUploadTicket.submissionId, submission.id),
      )
      .where(
        and(
          eq(submission.studentId, input.studentId),
          gt(submissionUploadTicket.createdAt, dailyWindowStart),
        ),
      ),
    db
      .select({ questionId: submissionFile.questionId })
      .from(submissionFile)
      .where(eq(submissionFile.submissionId, input.submissionId)),
    db
      .select({ questionId: submissionUploadTicket.questionId })
      .from(submissionUploadTicket)
      .where(
        and(
          eq(submissionUploadTicket.submissionId, input.submissionId),
          isNull(submissionUploadTicket.consumedAt),
          gt(submissionUploadTicket.createdAt, activeSince),
        ),
      ),
  ]);

  if ((dailyResult[0]?.total ?? 0) >= MAX_TICKETS_PER_STUDENT_DAY) {
    return { kind: 'rate-limited', retryAfterSeconds: 24 * 60 * 60 };
  }
  if ((recentResult[0]?.total ?? 0) >= MAX_TICKETS_PER_STUDENT_WINDOW) {
    return { kind: 'rate-limited', retryAfterSeconds: 10 * 60 };
  }

  const storedRecordingQuestions = new Set(
    storedFiles.flatMap((file) =>
      file.questionId === null ? [] : [file.questionId],
    ),
  );
  const reservedSlots = activeTickets.filter(
    (ticket) =>
      ticket.questionId === null ||
      !storedRecordingQuestions.has(ticket.questionId),
  ).length;
  const newSlot =
    input.questionId === null || !storedRecordingQuestions.has(input.questionId)
      ? 1
      : 0;

  if (storedFiles.length + reservedSlots + newSlot > MAX_SUBMISSION_FILES) {
    return { kind: 'attempt-full' };
  }

  const [created] = await db
    .insert(submissionUploadTicket)
    .values({
      submissionId: input.submissionId,
      questionId: input.questionId,
      objectKey: input.key,
      originalFilename: input.originalFilename,
      expectedSize: input.expectedSize,
      mimeType: input.mimeType,
      createdAt: now,
    })
    .returning({ id: submissionUploadTicket.id });

  return { kind: 'granted', ticketId: created.id };
}

export async function isActiveSubmissionUploadTicket(
  token: SubmissionUploadTokenPayload,
): Promise<boolean> {
  const [ticket] = await db
    .select({ id: submissionUploadTicket.id })
    .from(submissionUploadTicket)
    .where(
      and(
        eq(submissionUploadTicket.id, token.ticketId),
        eq(submissionUploadTicket.submissionId, token.submissionId),
        eq(submissionUploadTicket.objectKey, token.key),
        eq(submissionUploadTicket.originalFilename, token.originalFilename),
        eq(submissionUploadTicket.expectedSize, token.size),
        eq(submissionUploadTicket.mimeType, token.mimeType),
        token.questionId === null
          ? isNull(submissionUploadTicket.questionId)
          : eq(submissionUploadTicket.questionId, token.questionId),
        isNull(submissionUploadTicket.consumedAt),
      ),
    )
    .limit(1);

  return Boolean(ticket);
}

export async function consumeSubmissionUploadTickets(
  tokens: SubmissionUploadTokenPayload[],
): Promise<void> {
  if (tokens.length === 0) return;
  const consumedAt = new Date();
  await Promise.all(
    tokens.map((token) =>
      db
        .update(submissionUploadTicket)
        .set({ consumedAt })
        .where(
          and(
            eq(submissionUploadTicket.id, token.ticketId),
            eq(submissionUploadTicket.objectKey, token.key),
            isNull(submissionUploadTicket.consumedAt),
          ),
        ),
    ),
  );
}

/** Return an error when saving these files would exceed the attempt quota. */
export async function validateAttemptFileQuota(
  submissionId: number,
  incoming: SubmissionFileInput[],
): Promise<string | null> {
  const stored = await db
    .select({ key: submissionFile.file, questionId: submissionFile.questionId })
    .from(submissionFile)
    .where(eq(submissionFile.submissionId, submissionId));

  const storedKeys = new Set(stored.map((file) => file.key));
  const storedRecordingQuestions = new Set(
    stored.flatMap((file) =>
      file.questionId === null ? [] : [file.questionId],
    ),
  );
  const incomingKeys = new Set<string>();
  const incomingRecordingQuestions = new Set<number>();
  let addedSlots = 0;

  for (const file of incoming) {
    if (incomingKeys.has(file.key)) {
      return 'The same upload was included more than once.';
    }
    incomingKeys.add(file.key);
    if (storedKeys.has(file.key)) continue;

    if (file.questionId === null) {
      addedSlots += 1;
      continue;
    }
    if (incomingRecordingQuestions.has(file.questionId)) {
      return 'Only one recording may be uploaded for each question.';
    }
    incomingRecordingQuestions.add(file.questionId);
    if (!storedRecordingQuestions.has(file.questionId)) addedSlots += 1;
  }

  return stored.length + addedSlots > MAX_SUBMISSION_FILES
    ? `An attempt can contain at most ${MAX_SUBMISSION_FILES} files.`
    : null;
}
