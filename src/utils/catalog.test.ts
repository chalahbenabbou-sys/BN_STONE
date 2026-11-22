import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeArabic,
  filterProducts,
  formatPrice,
  sanitizeWhatsappPhone,
  buildWhatsappUrl,
  isSafeImageUrl,
  validateProductInput,
} from './catalog';
import type { Product } from '../types';

const sampleProducts: Product[] = [
  {
    id: 'p1',
    name: 'خوذة كربون فايبر أصلية',
    price: 2450,
    description: 'حماية عالية للدراجات النارية',
    category: 'helmets',
    imageUrl: '/src/assets/images/helmet.jpg',
    published: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'p2',
    name: 'قفازات سباق جلدية',
    price: 540,
    description: 'قفازات مريحة ومقاومة للاحتكاك',
    category: 'gloves',
    imageUrl: '/src/assets/images/gloves.jpg',
    published: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

test('normalizeArabic unifies alef, teh marbuta, and strips diacritics', () => {
  assert.equal(normalizeArabic('خُوذَة أَصْلِيَّة'), 'خوذه اصليه');
  assert.equal(normalizeArabic('إكسسوارات'), 'اكسسوارات');
});

test('filterProducts filters by category and Arabic search query accurately', () => {
  assert.equal(filterProducts(sampleProducts, { category: 'all', query: '' }).length, 2);
  assert.equal(filterProducts(sampleProducts, { category: 'helmets', query: '' }).length, 1);
  assert.equal(filterProducts(sampleProducts, { category: 'all', query: 'اصلية' })[0]?.id, 'p1');
  assert.equal(filterProducts(sampleProducts, { category: 'jackets', query: 'كربون' }).length, 0);
});

test('formatPrice formats numbers cleanly with currency', () => {
  assert.equal(formatPrice(2450, 'ر.س'), '2,450 ر.س');
  assert.equal(formatPrice(99.5, 'ر.س'), '99.50 ر.س');
  assert.equal(formatPrice(-10, 'ر.س'), '0 ر.س');
});

test('WhatsApp helpers return null when phone is empty and build valid wa.me links when set', () => {
  assert.equal(sanitizeWhatsappPhone(''), '');
  assert.equal(sanitizeWhatsappPhone('123'), '');
  assert.equal(buildWhatsappUrl(''), null);
  assert.equal(sanitizeWhatsappPhone('+212763941307'), '212763941307');
  assert.equal(buildWhatsappUrl('+212763941307'), 'https://wa.me/212763941307');
  assert.equal(sanitizeWhatsappPhone('+966 50-123-4567'), '966501234567');
  assert.equal(
    buildWhatsappUrl('+966 50 123 4567', 'مرحباً BN_STONE'),
    'https://wa.me/966501234567?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20BN_STONE'
  );
});

test('isSafeImageUrl blocks javascript: and data: protocols while allowing https and relative paths', () => {
  assert.equal(isSafeImageUrl('/uploads/abc.png'), true);
  assert.equal(isSafeImageUrl('https://firebasestorage.googleapis.com/v0/b/test/o/img.jpg'), true);
  assert.equal(isSafeImageUrl('javascript:alert(1)'), false);
  assert.equal(isSafeImageUrl('data:image/svg+xml,<svg/>'), false);
  assert.equal(isSafeImageUrl('//evil.com/x.png'), false);
});

test('validateProductInput catches missing fields, negative prices, and invalid categories', () => {
  const invalid = validateProductInput({
    name: 'أ',
    price: -5,
    description: 'قصير',
    category: 'invalid' as Product['category'],
    imageUrl: 'javascript:alert(1)',
    published: true,
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.price);
  assert.ok(invalid.errors.description);
  assert.ok(invalid.errors.category);
  assert.ok(invalid.errors.imageUrl);

  const valid = validateProductInput({
    name: 'خوذة سباق كربون',
    price: 1200,
    description: 'خوذة احترافية معتمدة للقيادة السريعة.',
    category: 'helmets',
    imageUrl: '/uploads/test.jpg',
    published: true,
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});
