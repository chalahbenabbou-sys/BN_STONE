import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Upload, X } from 'lucide-react';
import {
  PRODUCT_CATEGORIES,
  type Product,
  type ProductCategory,
  type ProductInput,
} from '../types';
import { validateProductInput } from '../utils/catalog';
import { SafeImage } from './SafeImage';

interface ProductFormModalProps {
  isOpen: boolean;
  editingProduct: Product | null;
  onClose: () => void;
  onUploadImage: (file: File) => Promise<string>;
  onSave: (input: ProductInput, editingId?: string) => Promise<void>;
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function ProductFormModal({
  isOpen,
  editingProduct,
  onClose,
  onUploadImage,
  onSave,
}: ProductFormModalProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<ProductCategory>('helmets');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [published, setPublished] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ProductInput, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (editingProduct) {
      setName(editingProduct.name);
      setPrice(String(editingProduct.price));
      setCategory(editingProduct.category);
      setDescription(editingProduct.description);
      setImageUrl(editingProduct.imageUrl);
      setPublished(editingProduct.published);
    } else {
      setName('');
      setPrice('');
      setCategory('helmets');
      setDescription('');
      setImageUrl('');
      setPublished(true);
    }
    setFieldErrors({});
    setSubmitError(null);
  }, [isOpen, editingProduct]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubmitError(null);
    setFieldErrors((prev) => ({ ...prev, imageUrl: undefined }));

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setFieldErrors((prev) => ({
        ...prev,
        imageUrl: 'الصيغ المدعومة فقط هي JPG و PNG و WEBP.',
      }));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setFieldErrors((prev) => ({
        ...prev,
        imageUrl: 'حجم الصورة يجب ألا يتجاوز 5 ميجابايت.',
      }));
      return;
    }

    setUploading(true);
    try {
      const uploadedUrl = await onUploadImage(file);
      setImageUrl(uploadedUrl);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'تعذر رفع الصورة. حاول مرة أخرى.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const parsedPrice = price.trim() === '' ? NaN : Number(price);
    const payload: ProductInput = {
      name: name.trim(),
      price: parsedPrice,
      category,
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      published,
    };

    const validation = validateProductInput(payload);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    setSaving(true);
    try {
      await onSave(payload, editingProduct?.id);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'تعذر حفظ المنتج. يرجى المحاولة مجدداً.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-form-title"
    >
      <div className="relative w-full max-w-2xl bg-[#121215] border border-white/12 rounded-2xl p-6 sm:p-8 my-8 shadow-2xl">
        <div className="flex items-center justify-between gap-4 pb-5 border-b border-white/8 mb-6">
          <h2 id="product-form-title" className="text-xl font-bold font-display text-white">
            {editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نموذج المنتج"
            className="w-9 h-9 rounded-lg inline-flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitError && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-lg bg-[#DC2626]/12 border border-[#DC2626]/35 text-sm text-red-200"
          >
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Image Upload Zone */}
          <div className="space-y-2">
            <label htmlFor="product-image-upload" className="block text-sm font-medium text-zinc-200">
              صورة المنتج
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-5 aspect-[4/3] rounded-xl overflow-hidden bg-[#09090B] border border-white/10">
                {imageUrl ? (
                  <SafeImage
                    src={imageUrl}
                    alt={name || 'معاينة صورة المنتج'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-500">
                    <ImagePlus className="w-7 h-7" aria-hidden="true" />
                    <span className="text-xs">معاينة الصورة</span>
                  </div>
                )}
              </div>

              <div className="sm:col-span-7 space-y-3">
                <input
                  ref={fileInputRef}
                  id="product-image-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#18181B] hover:bg-white/10 border border-dashed border-white/20 text-sm font-semibold text-zinc-200 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>جاري رفع الصورة...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-[#EF4444]" aria-hidden="true" />
                      <span>{imageUrl ? 'تغيير صورة المنتج' : 'رفع صورة من جهازك'}</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-zinc-500">
                  الصيغ المدعومة: JPG، PNG، WEBP بحد أقصى 5 ميجابايت.
                </p>
                {fieldErrors.imageUrl && (
                  <p className="text-xs text-[#EF4444]">{fieldErrors.imageUrl}</p>
                )}
              </div>
            </div>
          </div>

          {/* Product Name */}
          <div className="space-y-1.5">
            <label htmlFor="product-name" className="block text-sm font-medium text-zinc-200">
              اسم المنتج
            </label>
            <input
              id="product-name"
              type="text"
              maxLength={140}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: خوذة كربون فايبر رياضية"
              className="w-full px-4 py-3 bg-[#09090B] border border-white/12 focus:border-[#DC2626] rounded-lg text-white placeholder-zinc-600 focus:outline-none"
            />
            {fieldErrors.name && <p className="text-xs text-[#EF4444]">{fieldErrors.name}</p>}
          </div>

          {/* Price & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="product-price" className="block text-sm font-medium text-zinc-200">
                السعر
              </label>
              <input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                dir="ltr"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1450"
                className="w-full px-4 py-3 bg-[#09090B] border border-white/12 focus:border-[#DC2626] rounded-lg text-white placeholder-zinc-600 focus:outline-none text-left tabular-nums"
              />
              {fieldErrors.price && <p className="text-xs text-[#EF4444]">{fieldErrors.price}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="product-category" className="block text-sm font-medium text-zinc-200">
                الفئة
              </label>
              <select
                id="product-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-4 py-3 bg-[#09090B] border border-white/12 focus:border-[#DC2626] rounded-lg text-white focus:outline-none"
              >
                {PRODUCT_CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-[#121215]">
                    {cat.label}
                  </option>
                ))}
              </select>
              {fieldErrors.category && (
                <p className="text-xs text-[#EF4444]">{fieldErrors.category}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="product-description" className="block text-sm font-medium text-zinc-200">
              وصف المنتج
            </label>
            <textarea
              id="product-description"
              rows={4}
              maxLength={2500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب وصفاً تفصيلياً للخامة، الحماية، والمميزات..."
              className="w-full px-4 py-3 bg-[#09090B] border border-white/12 focus:border-[#DC2626] rounded-lg text-white placeholder-zinc-600 focus:outline-none resize-y"
            />
            {fieldErrors.description && (
              <p className="text-xs text-[#EF4444]">{fieldErrors.description}</p>
            )}
          </div>

          {/* Publish Status Toggle */}
          <label className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[#09090B] border border-white/8 cursor-pointer">
            <div>
              <span className="block text-sm font-semibold text-white">نشر المنتج في المتجر</span>
              <span className="block text-xs text-zinc-400">
                عند التفعيل سيظهر المنتج فوراً للزوار في الصفحة العامة.
              </span>
            </div>
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="w-5 h-5 accent-[#DC2626] rounded cursor-pointer"
            />
          </label>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-white/8">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#DC2626] hover:bg-[#EF4444] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>{editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
