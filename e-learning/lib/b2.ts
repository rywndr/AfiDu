/**
 * Backblaze B2 access for study material objects.
 *
 * The Django app writes these objects through django-storages; this app talks
 * to the same bucket over the same S3-compatible endpoint, using the same
 * `B2_*` environment variables so a single set of credentials serves both.
 *
 * Uploads do **not** pass through the server: `presignUpload` hands the browser
 * a short-lived signed PUT so a 500MB video never touches the function (Vercel
 * caps request bodies well below that). This does mean the bucket needs a CORS
 * rule allowing PUT from the app's origin -- see the README.
 */
import 'server-only';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { fileExtension } from '@/lib/choices';

const UPLOAD_URL_TTL_SECONDS = 15 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 60 * 60;

function normaliseEndpoint(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.includes('://') ? trimmed : `https://${trimmed}`;
}

const endpoint = normaliseEndpoint(process.env.B2_ENDPOINT_URL ?? '');
const region = process.env.B2_REGION_NAME ?? '';
const bucket = process.env.B2_BUCKET_NAME ?? '';
const keyId = process.env.B2_KEY_ID ?? '';
const applicationKey = process.env.B2_APPLICATION_KEY ?? '';

/**
 * Without all five values there is nowhere to upload to. Django falls back to
 * local disk in that case, which this app cannot read, so uploads are refused
 * rather than half-working.
 */
export function isB2Configured(): boolean {
  return Boolean(endpoint && region && bucket && keyId && applicationKey);
}

let client: S3Client | undefined;

function s3(): S3Client {
  if (!isB2Configured()) {
    throw new Error('Backblaze B2 is not configured.');
  }
  client ??= new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId: keyId, secretAccessKey: applicationKey },
    forcePathStyle: true,
    // B2 rejects the flexible-checksum headers the SDK adds by default, and a
    // presigned URL cannot carry them anyway.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return client;
}

/**
 * Same layout as Django's `study_material_upload_to`, so both apps write into
 * one flat, date-partitioned namespace with collision-free keys.
 */
export function studyMaterialKey(filename: string): string {
  return datedKey('study_materials', filename);
}

/** The `submissions/%Y/%m/` prefix `SubmissionFile.file` uploads to. */
export function submissionFileKey(filename: string): string {
  return datedKey('submissions', filename);
}

/** The `questions/%Y/%m/` prefix used by `Question.audio`. */
export function questionAudioKey(filename: string): string {
  return datedKey('questions', filename);
}

function datedKey(prefix: string, filename: string): string {
  const extension = fileExtension(filename) || 'bin';
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const id = crypto.randomUUID().replaceAll('-', '');
  return `${prefix}/${year}/${month}/${id}.${extension}`;
}

/** Short-lived signed PUT the browser uploads straight to B2 with. */
export async function presignUpload(key: string, contentType: string) {
  return getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS },
  );
}

/** Signed GET for a private object, optionally forcing a download. */
export async function presignDownload(
  key: string,
  options: { filename?: string; download?: boolean } = {},
) {
  const { filename, download = false } = options;
  const disposition = filename
    ? `${download ? 'attachment' : 'inline'}; filename="${filename.replaceAll('"', '')}"`
    : undefined;

  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: disposition,
    }),
    { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
  );
}

/**
 * Best-effort object removal. Django logs and swallows the same failure: an
 * orphaned object is a smaller problem than a row that refuses to be deleted.
 */
export async function deleteObject(key: string): Promise<void> {
  if (!key || !isB2Configured()) return;
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    console.error('could not delete B2 object', key, error);
  }
}
