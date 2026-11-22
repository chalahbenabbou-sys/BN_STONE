import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  AlertCircle,
  Loader2,
  MessageCircle,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import { AdminAuthModal } from './components/AdminAuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ProductCard } from './components/ProductCard';
import { ProductDetailView } from './components/ProductDetailView';
import { auth } from './firebase';
import {
  changeAdminPasscode,
  createServerProduct,
  deleteServerProduct,
  fetchAdminProducts,
  fetchPublicProducts,
  fetchPublicSettings,
  fileToDataUrl,
  saveServerSettings,
  seedServerDefaultProducts,
  toggleServerProductVisibility,
  updateServerProduct,
  uploadImageToServer,
} from './services/api';
import {
  checkFirebaseAdminStatus,
  createFirestoreProduct,
  deleteFirestoreProduct,
  saveFirestoreStoreSettings,
  seedDefaultProductsToFirestore,
  subscribeAdminProducts,
  subscribePublishedProducts,
  subscribeStoreSettings,
  toggleFirestoreProductVisibility,
  updateFirestoreProduct,
  uploadImageToFirebaseStorage,
} from './services/firestoreCatalog';
import {
  DEFAULT_SEED_PRODUCTS,
  DEFAULT_WHATSAPP_PHONE,
  PRODUCT_CATEGORIES,
  type CategoryFilter,
  type Product,
  type ProductInput,
  type StoreSettings,
} from './types';
import { filterProducts } from './utils/catalog';

const DEFAULT_SETTINGS: StoreSettings = {
  whatsappPhone: DEFAULT_WHATSAPP_PHONE,
  currency: 'ر.س',
  storeName: 'BN_STONE',
};

const INITIAL_FALLBACK_PRODUCTS: Product[] = DEFAULT_SEED_PRODUCTS.map((p) => ({
  ...p,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  source: 'server',
}));

export default function App() {
  // Public catalog & settings state
  const [firestoreProducts, setFirestoreProducts] = useState<Product[] | null>(null);
  const [serverProducts, setServerProducts] = useState<Product[]>(INITIAL_FALLBACK_PRODUCTS);
  const [firestoreSettings, setFirestoreSettings] = useState<StoreSettings | null>(null);
  const [serverSettings, setServerSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Storefront UI state
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('product');
  });
  const [whatsappNotice, setWhatsappNotice] = useState<string | null>(null);

  // Admin auth & dashboard state (tokens held strictly in React memory — never localStorage)
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminViewOpen, setAdminViewOpen] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isFirebaseAdmin, setIsFirebaseAdmin] = useState(false);
  const [serverAdminToken, setServerAdminToken] = useState<string | null>(null);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  const isAdminAuthenticated = isFirebaseAdmin || Boolean(serverAdminToken);
  const activeAdminMode: 'firebase' | 'server' | null = isFirebaseAdmin
    ? 'firebase'
    : serverAdminToken
      ? 'server'
      : null;

  // Load Express server public catalog & settings
  const refreshServerCatalog = useCallback(async () => {
    try {
      setCatalogError(null);
      const [products, settings] = await Promise.all([
        fetchPublicProducts(),
        fetchPublicSettings(),
      ]);
      setServerProducts(products);
      setServerSettings(settings);
    } catch (err) {
      console.error('Server catalog load warning:', err);
      // Keep fallback products visible if offline
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshServerCatalog();
  }, [refreshServerCatalog]);

  // Real-time Firestore public subscriptions (published products + store settings)
  useEffect(() => {
    const unsubProducts = subscribePublishedProducts(
      (items) => {
        setFirestoreProducts(items);
        setCatalogLoading(false);
      },
      () => {
        // Keep server catalog active if Firestore unavailable
        setCatalogLoading(false);
      }
    );

    const unsubSettings = subscribeStoreSettings(
      (settings) => {
        setFirestoreSettings(settings);
      },
      () => {
        // Fallback to server settings silently
      }
    );

    return () => {
      unsubProducts();
      unsubSettings();
    };
  }, []);

  // Track Firebase Auth state for admin verification
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const verifiedAdmin = await checkFirebaseAdminStatus();
        setIsFirebaseAdmin(verifiedAdmin);
      } else {
        setIsFirebaseAdmin(false);
      }
    });
    return () => unsub();
  }, []);

  // Attach admin product list ONLY when authenticated as admin
  useEffect(() => {
    if (!adminViewOpen || !activeAdminMode) {
      return;
    }
    if (activeAdminMode === 'firebase') {
      setAdminLoading(true);
      const unsub = subscribeAdminProducts(
        (items) => {
          setAdminProducts(items);
          setAdminLoading(false);
        },
        () => {
          setAdminLoading(false);
        }
      );
      return () => unsub();
    }

    if (activeAdminMode === 'server' && serverAdminToken) {
      setAdminLoading(true);
      fetchAdminProducts(serverAdminToken)
        .then((items) => setAdminProducts(items))
        .catch((err) => console.error('Failed to load admin products:', err))
        .finally(() => setAdminLoading(false));
    }
  }, [adminViewOpen, activeAdminMode, serverAdminToken]);

  // Keep URL query param synced with selected product (SEO-friendly deep links)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (selectedProductId) {
      url.searchParams.set('product', selectedProductId);
    } else {
      url.searchParams.delete('product');
    }
    window.history.replaceState({}, '', url.toString());
  }, [selectedProductId]);

  // Unified public catalog: prefer live Firestore products once populated, else live server catalog
  const publicProducts = useMemo(() => {
    if (firestoreProducts && firestoreProducts.length > 0) {
      return firestoreProducts;
    }
    return serverProducts;
  }, [firestoreProducts, serverProducts]);

  const activeSettings = useMemo(() => {
    if (firestoreSettings) {
      return firestoreSettings;
    }
    return serverSettings;
  }, [firestoreSettings, serverSettings]);

  const filteredProducts = useMemo(
    () => filterProducts(publicProducts, { category: selectedCategory, query: searchQuery }),
    [publicProducts, selectedCategory, searchQuery]
  );

  const selectedProduct = useMemo(
    () => (selectedProductId ? publicProducts.find((p) => p.id === selectedProductId) ?? null : null),
    [publicProducts, selectedProductId]
  );

  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return [];
    const sameCategory = publicProducts.filter(
      (p) => p.id !== selectedProduct.id && p.category === selectedProduct.category
    );
    const others = publicProducts.filter(
      (p) => p.id !== selectedProduct.id && p.category !== selectedProduct.category
    );
    return [...sameCategory, ...others].slice(0, 3);
  }, [publicProducts, selectedProduct]);

  const handleOpenAdminLock = () => {
    if (isAdminAuthenticated) {
      setAdminViewOpen(true);
    } else {
      setAdminModalOpen(true);
    }
  };

  const handleSignOutAdmin = async () => {
    if (firebaseUser) {
      await signOut(auth).catch(() => undefined);
    }
    setIsFirebaseAdmin(false);
    setServerAdminToken(null);
    setAdminViewOpen(false);
    setAdminProducts([]);
  };

  const handleAdminUploadImage = async (file: File): Promise<string> => {
    if (activeAdminMode === 'firebase') {
      try {
        return await uploadImageToFirebaseStorage(file);
      } catch (storageErr) {
        console.warn('Firebase Storage upload fallback check:', storageErr);
        if (serverAdminToken) {
          const dataUrl = await fileToDataUrl(file);
          return uploadImageToServer(serverAdminToken, dataUrl);
        }
        throw new Error(
          'تعذر رفع الصورة إلى Firebase Storage. تأكد من تفعيل Storage في مشروع Firebase أو استخدم الدخول برمز المالك.'
        );
      }
    }

    if (!serverAdminToken) {
      throw new Error('يرجى تسجيل الدخول كمالك لرفع الصور.');
    }
    const dataUrl = await fileToDataUrl(file);
    return uploadImageToServer(serverAdminToken, dataUrl);
  };

  const handleAdminSaveProduct = async (input: ProductInput, editingId?: string) => {
    if (activeAdminMode === 'firebase') {
      if (editingId) {
        await updateFirestoreProduct(editingId, input);
      } else {
        await createFirestoreProduct(input);
      }
      return;
    }

    if (!serverAdminToken) throw new Error('الجلسة غير صالحة.');
    if (editingId) {
      await updateServerProduct(serverAdminToken, editingId, input);
    } else {
      await createServerProduct(serverAdminToken, input);
    }
    const [latestAdmin, latestPublic] = await Promise.all([
      fetchAdminProducts(serverAdminToken),
      fetchPublicProducts(),
    ]);
    setAdminProducts(latestAdmin);
    setServerProducts(latestPublic);
  };

  const handleAdminToggleVisibility = async (product: Product) => {
    const nextPublished = !product.published;
    if (activeAdminMode === 'firebase') {
      await toggleFirestoreProductVisibility(product.id, nextPublished);
      return;
    }

    if (!serverAdminToken) throw new Error('الجلسة غير صالحة.');
    await toggleServerProductVisibility(serverAdminToken, product.id, nextPublished);
    const [latestAdmin, latestPublic] = await Promise.all([
      fetchAdminProducts(serverAdminToken),
      fetchPublicProducts(),
    ]);
    setAdminProducts(latestAdmin);
    setServerProducts(latestPublic);
  };

  const handleAdminDeleteProduct = async (product: Product) => {
    if (activeAdminMode === 'firebase') {
      await deleteFirestoreProduct(product.id);
      return;
    }

    if (!serverAdminToken) throw new Error('الجلسة غير صالحة.');
    await deleteServerProduct(serverAdminToken, product.id);
    const [latestAdmin, latestPublic] = await Promise.all([
      fetchAdminProducts(serverAdminToken),
      fetchPublicProducts(),
    ]);
    setAdminProducts(latestAdmin);
    setServerProducts(latestPublic);
  };

  const handleAdminSaveSettings = async (next: { whatsappPhone: string; currency: string }) => {
    if (activeAdminMode === 'firebase') {
      await saveFirestoreStoreSettings(next);
      return;
    }

    if (!serverAdminToken) throw new Error('الجلسة غير صالحة.');
    const saved = await saveServerSettings(serverAdminToken, next);
    setServerSettings(saved);
  };

  // Render Private Owner Dashboard ONLY when verified
  if (adminViewOpen && isAdminAuthenticated && activeAdminMode) {
    return (
      <AdminDashboard
        authMode={activeAdminMode}
        adminLabel={
          activeAdminMode === 'firebase'
            ? firebaseUser?.email || 'مالك المتجر (Firebase)'
            : 'مالك المتجر (جلسة خادم مؤمّنة)'
        }
        products={adminProducts}
        settings={activeSettings}
        loading={adminLoading}
        onExitToStore={() => setAdminViewOpen(false)}
        onSignOut={handleSignOutAdmin}
        onUploadImage={handleAdminUploadImage}
        onSaveProduct={handleAdminSaveProduct}
        onToggleVisibility={handleAdminToggleVisibility}
        onDeleteProduct={handleAdminDeleteProduct}
        onSaveSettings={handleAdminSaveSettings}
        onSeedDefaults={async () => {
          if (activeAdminMode === 'firebase') {
            await seedDefaultProductsToFirestore();
          } else if (serverAdminToken) {
            const seeded = await seedServerDefaultProducts(serverAdminToken);
            setAdminProducts(seeded);
            const latestPublic = await fetchPublicProducts();
            setServerProducts(latestPublic);
          }
        }}
        onChangePasscode={
          activeAdminMode === 'server' && serverAdminToken
            ? (curr, next) => changeAdminPasscode(serverAdminToken, curr, next)
            : undefined
        }
      />
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex flex-col">
      <Header
        settings={activeSettings}
        onNavigateHome={() => setSelectedProductId(null)}
        onSelectCategory={(cat) => {
          setSelectedProductId(null);
          setSelectedCategory(cat);
        }}
        onWhatsappFallback={() =>
          setWhatsappNotice(
            'لم يتم إضافة رقم الواتساب بعد. يمكن لمالك المتجر إعداد رقم الواتساب من لوحة الإدارة ليتم تفعيل التواصل المباشر فوراً.'
          )
        }
      />

      {selectedProduct ? (
        <div className="flex-1">
          <ProductDetailView
            product={selectedProduct}
            relatedProducts={relatedProducts}
            settings={activeSettings}
            onBack={() => {
              setSelectedProductId(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectProduct={(prod) => {
              setSelectedProductId(prod.id);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onWhatsappFallback={(prodName) =>
              setWhatsappNotice(
                `لم يتم تفعيل رقم الواتساب بعد${
                  prodName ? ` لطلب «${prodName}»` : ''
                }. يمكن لمالك المتجر ضبط رقم الواتساب من لوحة الإدارة في أي وقت.`
              )
            }
          />
        </div>
      ) : (
        <main className="flex-1">
          <Hero
            productCount={publicProducts.length}
            whatsappPhone={activeSettings.whatsappPhone}
            onExploreCatalog={() => {
              document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
            }}
            onWhatsappFallback={() =>
              setWhatsappNotice(
                'لم يتم إضافة رقم الواتساب بعد. يمكن لمالك المتجر إعداد رقم الواتساب من لوحة الإدارة ليتم تفعيل التواصل المباشر فوراً.'
              )
            }
          />

          {/* Catalog Section: Search + Category Filter + Product Grid */}
          <section
            id="catalog"
            aria-labelledby="catalog-heading"
            className="scroll-mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20"
          >
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-white/8">
              <div className="space-y-2">
                <h2
                  id="catalog-heading"
                  className="text-2xl sm:text-3xl font-extrabold font-display text-white"
                >
                  تشكيلة المعدات والإكسسوارات
                </h2>
                <p className="text-sm text-zinc-400">
                  اختر الفئة المناسبة أو ابحث باسم المنتج لاستعراض المواصفات والأسعار.
                </p>
              </div>

              {/* Search Input */}
              <div className="w-full lg:w-80 relative">
                <label htmlFor="catalog-search" className="sr-only">
                  ابحث عن منتج بالاسم
                </label>
                <Search
                  className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="catalog-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم المنتج..."
                  className="w-full pr-10 pl-10 py-3 bg-[#121215] border border-white/10 focus:border-[#DC2626] rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="مسح البحث"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md inline-flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Functional Category Filter Bar */}
            <div className="py-6 flex flex-wrap items-center justify-between gap-4">
              <div
                role="tablist"
                aria-label="تصفية المنتجات حسب الفئة"
                className="flex flex-wrap items-center gap-2"
              >
                {PRODUCT_CATEGORIES.map((category) => {
                  const active = selectedCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-[#DC2626] text-white'
                          : 'bg-[#121215] text-zinc-300 hover:text-white hover:bg-[#18181B] border border-white/8'
                      }`}
                    >
                      {category.shortLabel}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs sm:text-sm text-zinc-400 tabular-nums">
                عرض <span className="text-white font-semibold">{filteredProducts.length}</span> من{' '}
                <span>{publicProducts.length}</span> منتج
              </p>
            </div>

            {/* Catalog Content States */}
            {catalogLoading && publicProducts.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400">
                <Loader2 className="w-7 h-7 animate-spin text-[#DC2626]" aria-hidden="true" />
                <p className="text-sm">جاري تحميل المنتجات...</p>
              </div>
            ) : catalogError ? (
              <div className="py-16 text-center bg-[#121215] border border-white/8 rounded-xl p-8 space-y-4">
                <AlertCircle className="w-8 h-8 text-[#EF4444] mx-auto" aria-hidden="true" />
                <p className="text-base font-bold text-white">{catalogError}</p>
                <button
                  type="button"
                  onClick={() => void refreshServerCatalog()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#DC2626] hover:bg-[#EF4444] rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>إعادة المحاولة</span>
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div
                data-testid="empty-catalog-state"
                className="py-16 text-center bg-[#121215] border border-white/8 rounded-xl p-8 space-y-4"
              >
                {publicProducts.length === 0 ? (
                  <>
                    <p className="text-lg font-bold font-display text-white">
                      جاري تحديث تشكيلة <span dir="ltr">BN_STONE</span>
                    </p>
                    <p className="text-sm text-zinc-400 max-w-md mx-auto">
                      يتم الآن تجهيز وإضافة أحدث إكسسوارات ومعدات الدراجات النارية. يمكنك التواصل
                      معنا مباشرة عبر واتساب للاستفسار والطلب الفوري.
                    </p>
                    <a
                      href={`https://wa.me/${
                        (activeSettings.whatsappPhone || DEFAULT_WHATSAPP_PHONE).replace(/[^\d]/g, '')
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#DC2626] hover:bg-[#EF4444] rounded-lg transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" aria-hidden="true" />
                      <span>تواصل عبر واتساب</span>
                    </a>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold font-display text-white">
                      لا توجد منتجات مطابقة لبحثك
                    </p>
                    <p className="text-sm text-zinc-400">
                      جرب تغيير كلمات البحث أو استعراض جميع الفئات المتوفرة.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('all');
                        setSearchQuery('');
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#18181B] hover:bg-[#DC2626] border border-white/10 rounded-lg transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>عرض جميع المنتجات</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div
                data-testid="product-grid"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7"
              >
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    currency={activeSettings.currency}
                    onSelect={(item) => {
                      setSelectedProductId(item.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Craftsmanship & Rider Standards Section */}
          <section
            id="standards"
            aria-labelledby="standards-heading"
            className="scroll-mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24"
          >
            <div className="border-t border-white/8 pt-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-4 space-y-3">
                <p className="text-xs font-semibold text-[#EF4444]">لماذا BN_STONE</p>
                <h2
                  id="standards-heading"
                  className="text-2xl sm:text-3xl font-extrabold font-display text-white leading-snug"
                  style={{ textWrap: 'balance' }}
                >
                  معايير لا تقبل المساومة في السلامة والأداء
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  كل قطعة في متجرنا مختارة لتمنح الدراج أعلى درجات الحماية والراحة مع تصميم أسود
                  وأحمر يعكس روح القوة والانضباط.
                </p>
              </div>

              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-[#121215] border border-white/8 rounded-xl p-6 space-y-3">
                  <ShieldCheck className="w-6 h-6 text-[#DC2626]" aria-hidden="true" />
                  <h3 className="text-base font-bold font-display text-white">حماية معتمدة</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    خوذات ودروع قيادة مطابقة لمواصفات السلامة العالمية ECE و CE للثبات والأمان.
                  </p>
                </div>

                <div className="bg-[#121215] border border-white/8 rounded-xl p-6 space-y-3">
                  <Sparkles className="w-6 h-6 text-[#DC2626]" aria-hidden="true" />
                  <h3 className="text-base font-bold font-display text-white">خامات فاخرة</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    ألياف الكربون المطروق، الجلد الطبيعي المعالج، والتيتانيوم المصقول لتحمل طويل الأمد.
                  </p>
                </div>

                <div className="bg-[#121215] border border-white/8 rounded-xl p-6 space-y-3">
                  <Truck className="w-6 h-6 text-[#DC2626]" aria-hidden="true" />
                  <h3 className="text-base font-bold font-display text-white">طلب مباشر وسريع</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    تصفح فوري بدون تسجيل دخول مع تواصل مباشر وسريع لتأكيد المقاس والتوصيل.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      <Footer
        settings={activeSettings}
        onSelectCategory={(category) => {
          setSelectedProductId(null);
          setSelectedCategory(category);
        }}
        onOpenAdminLock={handleOpenAdminLock}
        onWhatsappFallback={() =>
          setWhatsappNotice(
            'لم يتم إضافة رقم الواتساب بعد. يمكن لمالك المتجر إعداد رقم الواتساب من لوحة الإدارة ليتم تفعيل التواصل المباشر فوراً.'
          )
        }
      />

      {/* WhatsApp Unconfigured Notice Dialog */}
      {whatsappNotice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="whatsapp-notice-title"
        >
          <div className="w-full max-w-md bg-[#121215] border border-white/12 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#DC2626]/15 text-[#EF4444] flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 id="whatsapp-notice-title" className="text-lg font-bold font-display text-white">
                  التواصل عبر واتساب
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappNotice(null)}
                aria-label="إغلاق الرسالة"
                className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/8 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{whatsappNotice}</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setWhatsappNotice(null)}
                className="px-5 py-2.5 text-sm font-bold text-white bg-[#DC2626] hover:bg-[#EF4444] rounded-lg transition-colors cursor-pointer"
              >
                حسناً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Private Admin Authentication Modal */}
      <AdminAuthModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onFirebaseAdminSuccess={() => {
          setIsFirebaseAdmin(true);
          setAdminModalOpen(false);
          setAdminViewOpen(true);
        }}
        onServerAdminSuccess={(token) => {
          setServerAdminToken(token);
          setAdminModalOpen(false);
          setAdminViewOpen(true);
        }}
      />
    </div>
  );
}
