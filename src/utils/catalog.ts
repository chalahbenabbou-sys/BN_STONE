import type { CategoryFilter, Product, ProductCategory, ProductInput } from '../types';

const VALID_CATEGORIES: ReadonlySet<string> = new Set([
  'helmets',
  'gloves',
  'jackets',
  'accessories',
]);

/**
 * Normalizes Arabic and Latin text for forgiving catalog search:
 * strips tashkeel/diacritics, unifies alef forms, teh marbuta, and alef maqsura.
 */
export function normalizeArabic(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

/**
 * Filters a product list by active category and Arabic/Latin search query.
 */
export function filterProducts(
  products: Product[],
  options: { category: CategoryFilter; query: string }
): Product[] {
  const normalizedQuery = normalizeArabic(options.query);

  return products.filter((product) => {
    if (options.category !== 'all' && product.category !== options.category) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    const nameNorm = normalizeArabic(product.name);
    const descNorm = normalizeArabic(product.description);
    return nameNorm.includes(normalizedQuery) || descNorm.includes(normalizedQuery);
  });
}

/**
 * Formats a numeric price cleanly with tabular Western numerals and Arabic currency label.
 */
export function formatPrice(price: number, currency = 'ر.س'): string {
  const safePrice = Number.isFinite(price) && price >= 0 ? price : 0;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: safePrice % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(safePrice);
  return `${formatted} ${currency.trim() || 'ر.س'}`;
}

/**
 * Sanitizes a WhatsApp phone number into pure international digits (E.164 without leading +).
 * Returns empty string if unset or invalid (< 7 digits).
 */
export function sanitizeWhatsappPhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '').replace(/^00/, '');
  if (digits.length < 7 || digits.length > 15) {
    return '';
  }
  return digits;
}

/**
 * Builds an official https://wa.me URL or returns null when the phone setting is empty.
 */
export function buildWhatsappUrl(rawPhone: string, message?: string): string | null {
  const digits = sanitizeWhatsappPhone(rawPhone);
  if (!digits) {
    return null;
  }
  const base = `https://wa.me/${digits}`;
  if (!message || !message.trim()) {
    return base;
  }
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

/**
 * Validates whether a URL is safe for rendering in <img> src attributes.
 */
export function isSafeImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.length < 5 || trimmed.length > 2048) {
    return false;
  }
  if (trimmed.startsWith('/')) {
    return !trimmed.startsWith('//');
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export interface ProductValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof ProductInput, string>>;
}

/**
 * Validates product fields synchronously against the exact blueprint constraints.
 */
export function validateProductInput(input: Partial<ProductInput>): ProductValidationResult {
  const errors: Partial<Record<keyof ProductInput, string>> = {};

  const name = (input.name ?? '').trim();
  if (name.length < 2) {
    errors.name = 'يرجى إدخال اسم المنتج (حرفين على الأقل).';
  } else if (name.length > 140) {
    errors.name = 'اسم المنتج يجب ألا يتجاوز 140 حرفاً.';
  }

  const price = Number(input.price);
  if (input.price === undefined || input.price === null || !Number.isFinite(price) || price < 0) {
    errors.price = 'يرجى إدخال سعر صحيح أكبر من أو يساوي صفر.';
  } else if (price > 10_000_000) {
    errors.price = 'السعر المدخل يتجاوز الحد المسموح به.';
  }

  const description = (input.description ?? '').trim();
  if (description.length < 5) {
    errors.description = 'يرجى كتابة وصف واضح للمنتج (5 أحرف على الأقل).';
  } else if (description.length > 2500) {
    errors.description = 'وصف المنتج يجب ألا يتجاوز 2500 حرف.';
  }

  if (!input.category || !VALID_CATEGORIES.has(input.category)) {
    errors.category = 'يرجى اختيار فئة صحيحة للمنتج.';
  }

  const imageUrl = (input.imageUrl ?? '').trim();
  if (!imageUrl) {
    errors.imageUrl = 'يرجى رفع صورة للمنتج.';
  } else if (!isSafeImageUrl(imageUrl)) {
    errors.imageUrl = 'رابط الصورة غير صالح (يجب أن يبدأ بـ https:// أو يكون مرفوعاً عبر المتجر).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function isValidProductCategory(value: string): value is ProductCategory {
  return VALID_CATEGORIES.has(value);
}
