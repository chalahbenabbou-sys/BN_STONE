import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { CATEGORY_LABELS, type Product, type ProductInput, type StoreSettings } from '../types';
import { formatPrice, sanitizeWhatsappPhone } from '../utils/catalog';
import { ProductFormModal } from './ProductFormModal';
import { SafeImage } from './SafeImage';

interface AdminDashboardProps {
  authMode: 'firebase' | 'server';
  adminLabel: string;
  products: Product[];
  settings: StoreSettings;
  loading: boolean;
  onExitToStore: () => void;
  onSignOut: () => void;
  onUploadImage: (file: File) => Promise<string>;
  onSaveProduct: (input: ProductInput, editingId?: string) => Promise<void>;
  onToggleVisibility: (product: Product) => Promise<void>;
  onDeleteProduct: (product: Product) => Promise<void>;
  onSaveSettings: (settings: { whatsappPhone: string; currency: string }) => Promise<void>;
  onSeedDefaults?: () => Promise<void>;
  onChangePasscode?: (currentCode: string, newCode: string) => Promise<void>;
}

export function AdminDashboard({
  authMode,
  adminLabel,
  products,
  settings,
  loading,
  onExitToStore,
  onSignOut,
  onUploadImage,
  onSaveProduct,
  onToggleVisibility,
  onDeleteProduct,
  onSaveSettings,
  onSeedDefaults,
  onChangePasscode,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'settings'>('products');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Store settings form state
  const [whatsappPhone, setWhatsappPhone] = useState(settings.whatsappPhone);
  const [currency, setCurrency] = useState(settings.currency);
  const [savingSettings, setSavingSettings] = useState(false);

  // Passcode update state (server mode)
  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [changingPasscode, setChangingPasscode] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    setWhatsappPhone(settings.whatsappPhone);
    setCurrency(settings.currency);
  }, [settings.whatsappPhone, settings.currency]);

  const publishedCount = products.filter((p) => p.published).length;
  const hiddenCount = products.length - publishedCount;

  const showSuccess = (message: string) => {
    setActionError(null);
    setActionFeedback(message);
    window.setTimeout(() => {
      setActionFeedback((curr) => (curr === message ? null : curr));
    }, 4000);
  };

  const handleToggle = async (product: Product) => {
    setBusyId(product.id);
    setActionError(null);
    try {
      await onToggleVisibility(product);
      showSuccess(
        product.published ? `تم إخفاء "${product.name}" من المتجر العام.` : `تم نشر "${product.name}" في المتجر العام.`
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'تعذر تغيير حالة المنتج.');
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setActionError(null);
    try {
      const removedName = deleteTarget.name;
      await onDeleteProduct(deleteTarget);
      setDeleteTarget(null);
      showSuccess(`تم حذف "${removedName}" نهائياً.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'تعذر حذف المنتج.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setActionError(null);
    try {
      await onSaveSettings({ whatsappPhone: whatsappPhone.trim(), currency: currency.trim() || 'ر.س' });
      showSuccess('تم حفظ إعدادات المتجر بنجاح.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'تعذر حفظ الإعدادات.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onChangePasscode) return;
    setChangingPasscode(true);
    setActionError(null);
    try {
      await onChangePasscode(currentCode, newCode);
      setCurrentCode('');
      setNewCode('');
      showSuccess('تم تحديث رمز الدخول السري بنجاح.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'تعذر تحديث رمز الدخول.');
    } finally {
      setChangingPasscode(false);
    }
  };

  const handleSeedClick = async () => {
    if (!onSeedDefaults) return;
    setSeeding(true);
    setActionError(null);
    try {
      await onSeedDefaults();
      showSuccess('تمت إضافة مجموعة BN_STONE الأساسية إلى قاعدة البيانات.');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'تعذر استيراد المنتجات الأساسية.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA]">
      {/* Admin Top Bar */}
      <header className="sticky top-0 z-30 bg-[#09090B]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-1.5 h-6 bg-[#DC2626] -skew-x-12 shrink-0" aria-hidden="true" />
            <span dir="ltr" className="font-brand text-xl sm:text-2xl font-extrabold tracking-[0.14em] whitespace-nowrap">
              BN<span className="text-[#DC2626]">_</span>STONE
            </span>
            <span className="text-zinc-500 hidden sm:inline" aria-hidden="true">·</span>
            <span className="text-sm font-medium text-zinc-300 truncate hidden sm:inline">
              لوحة إدارة المتجر
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onExitToStore}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-zinc-200 bg-[#18181B] hover:bg-white/10 border border-white/10 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
              <span>معاينة المتجر</span>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-zinc-300 hover:text-white hover:bg-[#DC2626]/20 border border-white/10 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header & Primary Action */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white">
              إدارة متجر <span dir="ltr">BN_STONE</span>
            </h1>
            <p className="text-sm text-zinc-400">
              جلسة موثقة: <span className="text-zinc-200">{adminLabel}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-[#DC2626] hover:bg-[#EF4444] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>إضافة منتج جديد</span>
          </button>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          <div className="bg-[#121215] border border-white/8 rounded-xl p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-zinc-400">إجمالي المنتجات</p>
            <p className="font-brand text-3xl sm:text-4xl font-extrabold text-white tabular-nums mt-2">
              {products.length}
            </p>
          </div>
          <div className="bg-[#121215] border border-white/8 rounded-xl p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-zinc-400">منشورة في المتجر</p>
            <p className="font-brand text-3xl sm:text-4xl font-extrabold text-white tabular-nums mt-2">
              {publishedCount}
            </p>
          </div>
          <div className="bg-[#121215] border border-white/8 rounded-xl p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-zinc-400">مخفية مؤقتاً</p>
            <p className="font-brand text-3xl sm:text-4xl font-extrabold text-zinc-400 tabular-nums mt-2">
              {hiddenCount}
            </p>
          </div>
        </div>

        {/* Feedback / Error Banners */}
        {actionFeedback && (
          <div
            role="status"
            className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-200 flex items-center gap-2.5"
          >
            <Check className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>{actionFeedback}</span>
          </div>
        )}
        {actionError && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-[#DC2626]/12 border border-[#DC2626]/35 text-sm text-red-200"
          >
            {actionError}
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex items-center gap-2 border-b border-white/8">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-[#DC2626] text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            المنتجات ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-[#DC2626] text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            إعدادات الواتساب والأمان
          </button>
        </div>

        {activeTab === 'products' ? (
          loading ? (
            <div className="py-16 flex items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span>جاري تحميل المنتجات...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-[#121215] border border-white/8 rounded-xl p-10 text-center space-y-4">
              <p className="text-lg font-bold text-white">لا توجد منتجات محفوظة بعد</p>
              <p className="text-sm text-zinc-400 max-w-md mx-auto">
                يمكنك إضافة منتجك الأول الآن أو استيراد مجموعة BN_STONE الأساسية للبدء السريع.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setFormOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#DC2626] hover:bg-[#EF4444] rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة منتج جديد</span>
                </button>
                {onSeedDefaults && (
                  <button
                    type="button"
                    disabled={seeding}
                    onClick={handleSeedClick}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-zinc-200 bg-[#18181B] hover:bg-white/10 border border-white/10 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {seeding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Database className="w-4 h-4" />
                    )}
                    <span>استيراد المنتجات الافتراضية</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3" data-testid="admin-products-list">
              {products.map((product) => {
                const isBusy = busyId === product.id;
                return (
                  <div
                    key={product.id}
                    className="bg-[#121215] border border-white/8 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-20 h-16 rounded-lg overflow-hidden bg-[#18181B] border border-white/8 shrink-0">
                        <SafeImage
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h3 className="text-base font-bold text-white truncate">{product.name}</h3>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-400">
                          <span>{CATEGORY_LABELS[product.category]}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-brand text-sm font-bold text-zinc-200 tabular-nums">
                            {formatPrice(product.price, settings.currency)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              product.published ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'
                            }
                          >
                            {product.published ? 'منشور' : 'مخفي'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 justify-end">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleToggle(product)}
                        aria-label={product.published ? `إخفاء ${product.name}` : `نشر ${product.name}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#18181B] hover:bg-white/10 border border-white/10 text-zinc-200 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        {product.published ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>إخفاء</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                            <span>نشر</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setEditingProduct(product);
                          setFormOpen(true);
                        }}
                        aria-label={`تعديل ${product.name}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#18181B] hover:bg-white/10 border border-white/10 text-zinc-200 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>تعديل</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setDeleteTarget(product)}
                        aria-label={`حذف ${product.name}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#18181B] hover:bg-[#DC2626]/20 border border-white/10 hover:border-[#DC2626]/40 text-zinc-300 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WhatsApp & Currency Settings */}
            <form
              onSubmit={handleSaveSettingsSubmit}
              className="bg-[#121215] border border-white/8 rounded-xl p-6 space-y-5"
            >
              <div className="flex items-center gap-2.5">
                <MessageCircle className="w-5 h-5 text-[#EF4444]" aria-hidden="true" />
                <h2 className="text-lg font-bold font-display text-white">
                  إعدادات الواتساب والعملة
                </h2>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="settings-whatsapp" className="block text-sm font-medium text-zinc-200">
                  رقم الواتساب (مع رمز الدولة)
                </label>
                <input
                  id="settings-whatsapp"
                  type="tel"
                  dir="ltr"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="مثال: 966501234567"
                  className="w-full px-4 py-3 bg-[#09090B] border border-white/12 focus:border-[#DC2626] rounded-lg text-white placeholder-zinc-600 focus:outline-none text-left tabular-nums"
                />
                <p className="text-xs text-zinc-400">
                  {sanitizeWhatsappPhone(whatsappPhone)
                    ? `سيتم توجيه الزوار مباشرة إلى الرقم: +${sanitizeWhatsappPhone(whatsappPhone)}`
                    : 'اتركه فارغاً إذا كنت ترغب بتفعيله لاحقاً.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="settings-currency" className="block text-sm font-medium text-zinc-200">
                  العملة المعروضة
                </label>
                <input
                  id="settings-currency"
                  type="text"
                  maxLength={16}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="ر.س"
                  className="w-full px-4 py-3 bg-[#09090B] border border-white/12 focus:border-[#DC2626] rounded-lg text-white placeholder-zinc-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-[#DC2626] hover:bg-[#EF4444] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {savingSettings && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                <span>حفظ الإعدادات</span>
              </button>
            </form>

            {/* Security Info / Passcode Update */}
            {authMode === 'server' && onChangePasscode ? (
              <form
                onSubmit={handlePasscodeSubmit}
                className="bg-[#121215] border border-white/8 rounded-xl p-6 space-y-5"
              >
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-5 h-5 text-[#EF4444]" aria-hidden="true" />
                  <h2 className="text-lg font-bold font-display text-white">تغيير رمز الدخول السري</h2>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="current-passcode" className="block text-sm font-medium text-zinc-200">
                    رمز الدخول الحالي
                  </label>
                  <input
                    id="current-passcode"
                    type="password"
                    dir="ltr"
                    value={currentCode}
                    onChange={(e) => setCurrentCode(e.target.value)}
                    className="w-full px-4 py-3 bg-[#09090B] border border-white/12 focus:border-[#DC2626] rounded-lg text-white focus:outline-none text-left"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="new-passcode" className="block text-sm font-medium text-zinc-200">
                    رمز الدخول الجديد (6 أحرف على الأقل)
                  </label>
                  <input
                    id="new-passcode"
                    type="password"
                    dir="ltr"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-4 py-3 bg-[#09090B] border border-white/12 focus:border-[#DC2626] rounded-lg text-white focus:outline-none text-left"
                  />
                </div>

                <button
                  type="submit"
                  disabled={changingPasscode}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-[#18181B] hover:bg-white/10 border border-white/15 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                >
                  {changingPasscode && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  <span>تحديث رمز الدخول</span>
                </button>
              </form>
            ) : (
              <div className="bg-[#121215] border border-white/8 rounded-xl p-6 space-y-3">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-5 h-5 text-[#EF4444]" aria-hidden="true" />
                  <h2 className="text-lg font-bold font-display text-white">حماية حساب المالك</h2>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  أنت مسجل الدخول عبر Firebase Authentication بحساب المالك المعتمد. جميع عمليات
                  الإضافة والتعديل والحذف محمية بقواعد أمان Firestore على مستوى الخادم.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Product Create / Edit Modal */}
      <ProductFormModal
        isOpen={formOpen}
        editingProduct={editingProduct}
        onClose={() => {
          setFormOpen(false);
          setEditingProduct(null);
        }}
        onUploadImage={onUploadImage}
        onSave={async (input, id) => {
          await onSaveProduct(input, id);
          showSuccess(id ? 'تم حفظ تعديلات المنتج بنجاح.' : 'تمت إضافة المنتج ونشره في قاعدة البيانات.');
        }}
      />

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div className="w-full max-w-sm bg-[#121215] border border-white/12 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="space-y-2">
              <h3 id="delete-confirm-title" className="text-lg font-bold font-display text-white">
                تأكيد حذف المنتج
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                هل أنت متأكد من حذف <span className="text-white font-semibold">«{deleteTarget.name}»</span>؟
                لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={busyId === deleteTarget.id}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#DC2626] hover:bg-[#EF4444] rounded-lg transition-colors cursor-pointer disabled:opacity-60"
              >
                {busyId === deleteTarget.id && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>تأكيد الحذف</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
