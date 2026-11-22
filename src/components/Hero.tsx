import { ArrowDownLeft, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { DEFAULT_WHATSAPP_PHONE, HERO_IMAGE_URL } from '../types';
import { buildWhatsappUrl } from '../utils/catalog';
import { SafeImage } from './SafeImage';

interface HeroProps {
  productCount: number;
  whatsappPhone: string;
  onExploreCatalog: () => void;
  onWhatsappFallback: () => void;
}

export function Hero({
  productCount,
  whatsappPhone,
  onExploreCatalog,
  onWhatsappFallback,
}: HeroProps) {
  const whatsappUrl = buildWhatsappUrl(
    whatsappPhone || DEFAULT_WHATSAPP_PHONE,
    'مرحباً متجر BN_STONE، أرغب بالاستفسار عن إكسسوارات الدراجات النارية.'
  );

  return (
    <section
      id="hero"
      className="relative overflow-hidden border-b border-white/8 bg-[#09090B]"
    >
      {/* Full-bleed dark studio motorcycle photograph with measured contrast scrim */}
      <div className="relative min-h-[500px] sm:min-h-[580px] lg:min-h-[640px] flex items-end lg:items-center">
        <div className="absolute inset-0">
          <SafeImage
            src={HERO_IMAGE_URL}
            alt="دراجة نارية رياضية سوداء من ألياف الكربون بتفاصيل حمراء في معرض BN_STONE"
            loading="eager"
            className="w-full h-full object-cover object-center"
          />
          {/* Measured RTL contrast scrim for WCAG AA legibility across desktop and mobile */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/75 to-[#09090B]/20 lg:bg-gradient-to-l lg:from-[#09090B]/95 lg:via-[#09090B]/65 lg:to-transparent"
            aria-hidden="true"
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-24 pb-12 sm:py-20 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl space-y-6"
          >
            <p className="text-xs sm:text-sm font-medium tracking-wide text-zinc-300 flex items-center gap-2.5">
              <span className="inline-block w-6 h-[2px] bg-[#DC2626]" aria-hidden="true" />
              <span>مجموعة BN_STONE الفاخرة للدراجات النارية</span>
            </p>

            <h1
              className="text-3xl sm:text-5xl lg:text-[3.5rem] font-extrabold font-display leading-[1.16] text-white"
              style={{ textWrap: 'balance' }}
            >
              هندسة الحماية والأناقة
              <span className="block text-[#EF4444] mt-1">لكل طريق ومنعطف</span>
            </h1>

            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-lg">
              خوذات كربون فايبر، قفازات سباق، سترات مدرعة، ومعدات احترافية منتقاة بعناية لمنحك
              ثقة كاملة وحضوراً استثنائياً في كل رحلة.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                type="button"
                onClick={onExploreCatalog}
                className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3.5 text-sm sm:text-base font-bold text-white bg-[#DC2626] hover:bg-[#EF4444] rounded-lg transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 whitespace-nowrap"
              >
                <span>تصفح المنتجات</span>
                <ArrowDownLeft className="w-4 h-4" aria-hidden="true" />
              </button>

              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3.5 text-sm sm:text-base font-bold text-white bg-[#09090B]/90 hover:bg-[#DC2626] border border-[#DC2626] rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444] whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 text-[#EF4444] group-hover:text-white" aria-hidden="true" />
                  <span>تواصل عبر واتساب</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={onWhatsappFallback}
                  className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3.5 text-sm sm:text-base font-bold text-white bg-[#09090B]/90 hover:bg-[#DC2626] border border-[#DC2626] rounded-lg transition-all duration-150 cursor-pointer whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 text-[#EF4444]" aria-hidden="true" />
                  <span>تواصل عبر واتساب</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 text-sm text-zinc-400 pt-1">
              <span className="tabular-nums font-brand text-xl font-bold text-white">
                {productCount}
              </span>
              <span>منتجاً متاحاً للطلب المباشر</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
