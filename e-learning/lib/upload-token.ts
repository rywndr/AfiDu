import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

import { MATERIAL_TYPES } from '@/lib/choices';
import type { UploadedQuestionAudio } from '@/lib/form-schemas';

const TOKEN_TTL_MS = 20 * 60 * 1000;
const materialTypes = MATERIAL_TYPES.map(({ value }) => value) as [
  (typeof MATERIAL_TYPES)[number]['value'],
  ...(typeof MATERIAL_TYPES)[number]['value'][],
];

/** What every ticket says about the object it signed a PUT for. */
const filePayloadSchema = z.object({
  key: z.string().min(1),
  originalFilename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
});

const payloadSchema = filePayloadSchema.extend({
  classId: z.number().int().positive(),
  materialType: z.enum(materialTypes),
});

/**
 * A student's upload is tied to the attempt it was granted for, so a ticket
 * cannot be replayed against somebody else's submission.
 */
const submissionPayloadSchema = filePayloadSchema.extend({
  submissionId: z.number().int().positive(),
  questionId: z.number().int().positive().nullable(),
});

const questionAudioPayloadSchema = filePayloadSchema.extend({
  classId: z.number().int().positive(),
});

export type UploadTokenPayload = z.infer<typeof payloadSchema>;
export type SubmissionUploadTokenPayload = z.infer<typeof submissionPayloadSchema>;
export type QuestionAudioUploadTokenPayload = z.infer<
  typeof questionAudioPayloadSchema
>;

function secret() {
  const value = process.env.BETTER_AUTH_SECRET;
  if (!value) throw new Error('BETTER_AUTH_SECRET is required to sign uploads.');
  return value;
}

function signature(encodedPayload: string) {
  return createHmac('sha256', secret()).update(encodedPayload).digest('base64url');
}

function sign(payload: object): string {
  const encodedPayload = Buffer.from(
    JSON.stringify({ ...payload, expiresAt: Date.now() + TOKEN_TTL_MS }),
  ).toString('base64url');
  return `${encodedPayload}.${signature(encodedPayload)}`;
}

function verify<T>(token: string, schema: z.ZodType<T>): T | null {
  const [encodedPayload, suppliedSignature, extra] = token.split('.');
  if (!encodedPayload || !suppliedSignature || extra) return null;

  const expectedSignature = signature(encodedPayload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return null;
  }

  try {
    const parsed = schema.safeParse(
      JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')),
    );
    if (!parsed.success) return null;
    return (parsed.data as { expiresAt: number }).expiresAt < Date.now()
      ? null
      : parsed.data;
  } catch {
    return null;
  }
}

export function createUploadToken(
  payload: Omit<UploadTokenPayload, 'expiresAt'>,
): string {
  return sign(payload);
}

export function verifyUploadToken(token: string): UploadTokenPayload | null {
  return verify(token, payloadSchema);
}

export function createSubmissionUploadToken(
  payload: Omit<SubmissionUploadTokenPayload, 'expiresAt'>,
): string {
  return sign(payload);
}

export function verifySubmissionUploadToken(
  token: string,
): SubmissionUploadTokenPayload | null {
  return verify(token, submissionPayloadSchema);
}

export function createQuestionAudioUploadToken(
  payload: Omit<QuestionAudioUploadTokenPayload, 'expiresAt'>,
): string {
  return sign(payload);
}

export function verifyQuestionAudioUploadToken(
  token: string,
): QuestionAudioUploadTokenPayload | null {
  return verify(token, questionAudioPayloadSchema);
}

export function isValidQuestionAudioUpload(
  file: UploadedQuestionAudio,
  classId: number,
): boolean {
  const token = verifyQuestionAudioUploadToken(file.uploadToken);
  return Boolean(
    token &&
      token.classId === classId &&
      token.key === file.key &&
      token.originalFilename === file.originalFilename &&
      token.mimeType === file.mimeType &&
      token.size === file.size,
  );
}
