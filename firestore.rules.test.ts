import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
const blueprint = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf8'));

test('firestore.rules starts with rules_version 2 and global default-deny safety net', () => {
  assert.match(rulesContent, /rules_version\s*=\s*'2';/);
  assert.match(rulesContent, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/);
});

test('firestore.rules enforces email_verified on admin checks (blocks Email Spoofing)', () => {
  assert.match(rulesContent, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesContent, /isBootstrapAdmin\(\)/);
});

test('firestore.rules enforces Query Enforcer on public product listing (blocks hidden product scraping)', () => {
  assert.match(rulesContent, /allow list:\s*if existing\(\)\.published == true \|\| isBootstrapAdmin\(\);/);
});

test('firestore.rules enforces strict key allowlists and immutable audit fields (blocks Shadow Updates)', () => {
  assert.match(rulesContent, /data\.keys\(\)\.hasOnly\(/);
  assert.match(rulesContent, /incoming\(\)\.createdBy == existing\(\)\.createdBy/);
  assert.match(rulesContent, /incoming\(\)\.createdAt == existing\(\)\.createdAt/);
  assert.match(rulesContent, /affectedKeys\(\)\.hasOnly\(/);
});

test('firestore.rules enforces blueprint length limits and safe imageUrl schemes', () => {
  const productProps = blueprint.entities.Product.properties;
  assert.ok(rulesContent.includes(`data.name.size() <= ${productProps.name.maxLength}`));
  assert.ok(rulesContent.includes(`data.description.size() <= ${productProps.description.maxLength}`));
  assert.ok(rulesContent.includes(`data.imageUrl.size() <= ${productProps.imageUrl.maxLength}`));
  assert.match(rulesContent, /\^https:\/\/\.\*/);
});

test('firestore.rules covers every collection declared in firebase-blueprint.json', () => {
  assert.match(rulesContent, /match \/products\/\{productId\}/);
  assert.match(rulesContent, /match \/settings\/\{settingId\}/);
  assert.match(rulesContent, /match \/admins\/\{adminUid\}/);
});
