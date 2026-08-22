import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

import { MATERIAL_TYPES } from '@/lib/choices';

const TOKEN_TTL_MS = 20 * 60 * 1000;
const materialTypes = MATERIAL_TYPES.map(({ value }) => value) as [
  (typeof MATERIAL_TYPES)[number]['value'],
  ...(typeof MATERIAL_TYPES)[number]['value'][],
];

const payloadSchema = z.object({
  classId: z.number().int().positive(),
  materialType: z.enum(materialTypes),
  key: z.string().min(1),
  originalFilename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
});

export type UploadTokenPayload = z.infer<typeof payloadSchema>;

function secret() {
  const value = process.env.BETTER_AUTH_SECRET;
  if (!value) throw new Error('BETTER_AUTH_SECRET is required to sign uploads.');
  return value;
}

function signature(encodedPayload: string) {
  return createHmac('sha256', secret()).update(encodedPayload).digest('base64url');
}

export function createUploadToken(
  payload: Omit<UploadTokenPayload, 'expiresAt'>,
): string {
  const encodedPayload = Buffer.from(
    JSON.stringify({ ...payload, expiresAt: Date.now() + TOKEN_TTL_MS }),
  ).toString('base64url');
  return `${encodedPayload}.${signature(encodedPayload)}`;
}

export function verifyUploadToken(token: string): UploadTokenPayload | null {
  const [encodedPayload, suppliedSignature, extra] = token.split('.');
  if (!encodedPayload || !suppliedSignature || extra) return null;

  const expectedSignature = signature(encodedPayload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return null;
  }

  try {
    const parsed = payloadSchema.safeParse(
      JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')),
    );
    if (!parsed.success || parsed.data.expiresAt < Date.now()) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
