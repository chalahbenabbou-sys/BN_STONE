import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {
  hashPasscode,
  verifyPasscode,
  verifyEnvPasscode,
  signSessionToken,
  verifySessionToken,
  parseAndValidateImageDataUrl,
  resolveSafeUploadPath,
} from './authUtils';

test('scrypt passcode hashing verifies matching passcodes and rejects wrong passcodes', () => {
  const hash = hashPasscode('MySecretCode99');
  assert.ok(hash.startsWith('scrypt$'));
  assert.equal(verifyPasscode('MySecretCode99', hash), true);
  assert.equal(verifyPasscode('WrongCode', hash), false);
  assert.equal(verifyPasscode('MySecretCode99', 'malformed-hash'), false);
});

test('verifyEnvPasscode uses constant-time comparison', () => {
  assert.equal(verifyEnvPasscode('test-secret', 'test-secret'), true);
  assert.equal(verifyEnvPasscode('test-secre', 'test-secret'), false);
  assert.equal(verifyEnvPasscode('', 'test-secret'), false);
});

test('HMAC session token signs, verifies, rejects tampering, and rejects expiration', () => {
  const secret = 'unit-test-signing-key';
  const token = signSessionToken(secret, 300);
  const payload = verifySessionToken(token, secret);
  assert.ok(payload);
  assert.equal(payload.role, 'owner');

  // Tampered token rejected
  const tampered = token.slice(0, -2) + 'xx';
  assert.equal(verifySessionToken(tampered, secret), null);

  // Wrong secret rejected
  assert.equal(verifySessionToken(token, 'other-secret'), null);

  // Expired token rejected
  const expiredToken = signSessionToken(secret, -5);
  assert.equal(verifySessionToken(expiredToken, secret), null);
});

test('parseAndValidateImageDataUrl accepts valid PNG/JPEG magic bytes and rejects SVG/spoofed payloads', () => {
  // Minimal valid 1x1 transparent PNG
  const validPngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const pngRes = parseAndValidateImageDataUrl(`data:image/png;base64,${validPngBase64}`);
  assert.ok(pngRes);
  assert.equal(pngRes.ext, 'png');
  assert.equal(pngRes.mimeType, 'image/png');

  // Spoofed PNG header with HTML body must fail magic-byte check
  const fakePng = Buffer.from('<script>alert(1)</script>').toString('base64');
  assert.equal(parseAndValidateImageDataUrl(`data:image/png;base64,${fakePng}`), null);

  // SVG must be rejected
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString('base64');
  assert.equal(parseAndValidateImageDataUrl(`data:image/svg+xml;base64,${svg}`), null);
});

test('resolveSafeUploadPath allows strict UUID filenames and blocks path traversal', () => {
  const baseDir = '/tmp/bn_stone_uploads';
  const validId = '123e4567-e89b-12d3-a456-426614174000.png';
  assert.equal(resolveSafeUploadPath(baseDir, validId), path.resolve(baseDir, validId));

  assert.equal(resolveSafeUploadPath(baseDir, '../secret.env'), null);
  assert.equal(resolveSafeUploadPath(baseDir, 'not-a-uuid.png'), null);
  assert.equal(resolveSafeUploadPath(baseDir, '123e4567-e89b-12d3-a456-426614174000.svg'), null);
});
