import crypto from 'node:crypto';
import path from 'node:path';

export interface SessionPayload {
  role: 'owner';
  iat: number;
  exp: number;
}

const SCRYPT_KEYLEN = 64;
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Hashes an admin passcode with a random 16-byte salt using Node's native scrypt.
 */
export function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

/**
 * Verifies a plaintext passcode against a stored scrypt hash in constant time.
 */
export function verifyPasscode(passcode: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) {
    return false;
  }
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  const derivedBuf = crypto.scryptSync(passcode, salt, expectedBuf.length);
  if (derivedBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(derivedBuf, expectedBuf);
}

/**
 * Constant-time comparison for server-side environment passcode via SHA-256 digests.
 */
export function verifyEnvPasscode(input: string, envPasscode: string): boolean {
  if (!envPasscode || !input) {
    return false;
  }
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(envPasscode).digest();
  return crypto.timingSafeEqual(a, b);
}

/**
 * Signs an HMAC-SHA256 stateless Bearer token for the authenticated owner session.
 */
export function signSessionToken(secret: string, ttlSeconds = SESSION_TTL_SECONDS): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    role: 'owner',
    iat: now,
    exp: now + ttlSeconds,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 Bearer token and checks expiry.
 */
export function verifySessionToken(token: string, secret: string): SessionPayload | null {
  if (!token || typeof token !== 'string') {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }
  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as SessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (decoded.role !== 'owner' || typeof decoded.exp !== 'number' || decoded.exp <= now) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export interface ValidatedImageUpload {
  buffer: Buffer;
  ext: 'jpg' | 'png' | 'webp';
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

/**
 * Validates a base64 image data URL by checking MIME prefix, byte budget, and raw magic bytes.
 * Rejects SVG, HTML, polyglots, and corrupted files.
 */
export function parseAndValidateImageDataUrl(dataUrl: string): ValidatedImageUpload | null {
  if (typeof dataUrl !== 'string') {
    return null;
  }
  const match = dataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return null;
  }

  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    return null;
  }

  // Magic-byte verification (never trust MIME header alone)
  const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng =
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  const isWebp =
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';

  if (isJpeg) {
    return { buffer, ext: 'jpg', mimeType: 'image/jpeg' };
  }
  if (isPng) {
    return { buffer, ext: 'png', mimeType: 'image/png' };
  }
  if (isWebp) {
    return { buffer, ext: 'webp', mimeType: 'image/webp' };
  }

  return null;
}

const SAFE_UPLOAD_FILENAME = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;

/**
 * Validates a requested upload filename and confines resolution strictly inside uploadsDir.
 */
export function resolveSafeUploadPath(uploadsDir: string, filename: string): string | null {
  if (!SAFE_UPLOAD_FILENAME.test(filename)) {
    return null;
  }
  const baseDir = path.resolve(uploadsDir);
  const resolved = path.resolve(baseDir, filename);
  if (!resolved.startsWith(baseDir + path.sep)) {
    return null;
  }
  return resolved;
}
