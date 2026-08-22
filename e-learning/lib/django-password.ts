/**
 * Django-compatible `pbkdf2_sha256` password hashing.
 *
 * The Django app is the only thing that provisions credentials, and it stores
 * them in `auth_account.password` using its default hasher. better-auth's
 * built-in hasher is scrypt, so it is swapped for this in `lib/auth.ts` --
 * otherwise every sign-in would fail against a Django-written hash.
 *
 * Format: `pbkdf2_sha256$<iterations>$<salt>$<base64 derived key>`
 */
import { pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto';

const ALGORITHM = 'pbkdf2_sha256';
const DIGEST = 'sha256';
const KEY_LENGTH = 32; // sha256 digest size, matching Django's default dklen
/** Django 5.1's PBKDF2PasswordHasher default. Keep in step when Django bumps it. */
const DEFAULT_ITERATIONS = 870_000;
const SALT_ALPHABET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SALT_LENGTH = 22; // Django's get_random_string(22)

function derive(
  password: string,
  salt: string,
  iterations: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    pbkdf2(password, salt, iterations, KEY_LENGTH, DIGEST, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

function makeSalt(): string {
  const bytes = randomBytes(SALT_LENGTH);
  let salt = '';
  for (let i = 0; i < SALT_LENGTH; i += 1) {
    salt += SALT_ALPHABET[bytes[i] % SALT_ALPHABET.length];
  }
  return salt;
}

/**
 * Hash a password in Django's format, so a password changed from the
 * e-learning app stays readable by Django.
 */
export async function hashDjangoPassword(password: string): Promise<string> {
  const salt = makeSalt();
  const key = await derive(password, salt, DEFAULT_ITERATIONS);
  return `${ALGORITHM}$${DEFAULT_ITERATIONS}$${salt}$${key.toString('base64')}`;
}

/**
 * Verify a password against a Django-format hash. Returns false rather than
 * throwing on a malformed or unsupported hash, so a bad row cannot 500 sign-in.
 */
export async function verifyDjangoPassword(
  hash: string,
  password: string,
): Promise<boolean> {
  if (!hash) return false;

  const parts = hash.split('$');
  if (parts.length !== 4) return false;

  const [algorithm, iterationsRaw, salt, expectedBase64] = parts;
  if (algorithm !== ALGORITHM) return false;

  const iterations = Number.parseInt(iterationsRaw, 10);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;

  let expected: Buffer;
  try {
    expected = Buffer.from(expectedBase64, 'base64');
  } catch {
    return false;
  }
  if (expected.length !== KEY_LENGTH) return false;

  const actual = await derive(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}
