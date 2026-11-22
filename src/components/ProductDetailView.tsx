import { ArrowRight, CheckCircle2, MessageCircle, ShieldCheck, Truck } from 'lucide-react';
import { motion } from 'motion/react';
import {
  CATEGORY_LABELS,
  DEFAULT_WHATSAPP_PHONE,
  type Product,
  type StoreSettings,
} from '../types';
import { buildWhatsappUrl, formatPrice } from '../utils/catalog';
import { ProductCard } from './ProductCard';
import { SafeImage } from './SafeImage';

interface ProductDetailViewProps {
  product: Product;
  relatedProducts: Product[];
  settings: StoreSettings;
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  onWhatsappFallback: (productName?: string) => void;
}

export function ProductDetailView({
  product,
  relatedProducts,
  settings,
  onBack,
  onSelectProduct,
  onWhatsappFallback,
}: ProductDetailViewProps) {
  const inquiryMessage = `مرحباً BN_STONE، أرغب بالاستفسار وطلب المنتج: ${product.name} (${formatPrice(
    product.price,
    settings.currency
  )})`;
  const whatsappUrl = buildWhatsappUrl(
    settings.whatsappPhone || DEFAULT_WHATSAPP_PHONE,
    inquiryMessage
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Back navigation */}
      <div className="mb-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer py-2"
        >
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
          <span>العودة إلى قائمة المنتجات</span>
        </button>
      </div>

      {/* Main PDP Split: Sticky Gallery + Contiguous Purchase Module */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
      >
        {/* Product Image Gallery */}
        <div className="lg:col-span-7 lg:sticky lg:top-24">
          <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#121215] border border-white/10">
            <SafeImage
              src={product.imageUrl}
              alt={product.name}
              loading="eager"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Contiguous Details & Inquiry Module */}
        <div className="lg:col-span-5 bg-[#121215] border border-white/8 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
              <span>{CATEGORY_LABELS[product.category]}</span>
              <span aria-hidden="true">·</span>
              <span dir="ltr" className="font-brand tracking-wider text-zinc-300">
                BN_STONE
              </span>
            </div>

            <h1
              className="text-2xl sm:text-3xl font-extrabold font-display text-white leading-snug"
              style={{ textWrap: 'balance' }}
            >
              {product.name}
            </h1>

            <p className="font-brand text-3xl sm:text-4xl font-extrabold text-[#EF4444] tabular-nums tracking-wide pt-1">
              {formatPrice(product.price, settings.currency)}
            </p>
          </div>

          <div className="h-px bg-white/8" />

          <div className="space-y-2.5">
            <h2 className="text-sm font-bold text-zinc-200">وصف المنتج والمواصفات</h2>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>

          <div className="h-px bg-white/8" />

          {/* Concise assurance list */}
          <ul className="space-y-3 text-sm text-zinc-300">
            <li className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-[#DC2626] shrink-0" aria-hidden="true" />
              <span>منتج أصلي مطابق لمعايير السلامة والأداء العالي</span>
            </li>
            <li className="flex items-center gap-3">
              <Truck className="w-4 h-4 text-[#DC2626] shrink-0" aria-hidden="true" />
              <span>تجهيز سريع وتغليف محكم للحفاظ على جودة المعدات</span>
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-[#DC2626] shrink-0" aria-hidden="true" />
              <span>متوفر للطلب والاستفسار المباشر عبر واتساب</span>
            </li>
          </ul>

          {/* Primary Red & Black WhatsApp CTA */}
          <div className="pt-2">
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 w-full px-6 py-4 text-base font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] border border-[#EF4444]/40 rounded-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5" aria-hidden="true" />
                <span>اطلب عبر واتساب الآن</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => onWhatsappFallback(product.name)}
                className="flex items-center justify-center gap-2.5 w-full px-6 py-4 text-base font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] border border-[#EF4444]/40 rounded-lg transition-colors cursor-pointer"
              >
                <MessageCircle className="w-5 h-5" aria-hidden="true" />
                <span>اطلب عبر واتساب الآن</span>
              </button>
            )}
            <p className="text-xs text-zinc-500 text-center mt-3">
              لا يتطلب إنشاء حساب — تواصل مباشر وفوري مع فريق BN_STONE
            </p>
          </div>
        </div>
      </motion.div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-16 pt-12 border-t border-white/8">
          <div className="flex items-center justify-between gap-4 mb-8">
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
              منتجات أخرى قد تهمك
            </h2>
            <button
              type="button"
              onClick={onBack}
              className="text-sm font-medium text-zinc-400 hover:text-[#EF4444] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              عرض الكل
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProducts.slice(0, 3).map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                currency={settings.currency}
                onSelect={onSelectProduct}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
