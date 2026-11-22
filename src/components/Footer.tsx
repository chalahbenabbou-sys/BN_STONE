import { Lock, MessageCircle } from 'lucide-react';
import {
  DEFAULT_WHATSAPP_PHONE,
  PRODUCT_CATEGORIES,
  type CategoryFilter,
  type StoreSettings,
} from '../types';
import { buildWhatsappUrl } from '../utils/catalog';

interface FooterProps {
  settings: StoreSettings;
  onSelectCategory: (category: CategoryFilter) => void;
  onOpenAdminLock: () => void;
  onWhatsappFallback: () => void;
}

export function Footer({
  settings,
  onSelectCategory,
  onOpenAdminLock,
  onWhatsappFallback,
}: FooterProps) {
  const whatsappUrl = buildWhatsappUrl(
    settings.whatsappPhone || DEFAULT_WHATSAPP_PHONE,
    'مرحباً BN_STONE، أرغب بالتواصل معكم بخصوص المنتجات.'
  );

  return (
    <footer className="border-t border-white/8 bg-[#09090B] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-white/8">
          {/* Brand Summary */}
          <div className="md:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-2.5 text-white">
              <span
                className="w-1.5 h-6 bg-[#DC2626] -skew-x-12 inline-block"
                aria-hidden="true"
              />
              <span
                dir="ltr"
                className="font-brand text-2xl font-extrabold tracking-[0.14em] leading-none"
              >
                BN<span className="text-[#DC2626]">_</span>STONE
              </span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
              وجهتك المتخصصة لإكسسوارات ومعدات الدراجات النارية الفاخرة. نجمع بين الأمان المعتمد
              والتصميم الرياضي الراقي لتجربة قيادة استثنائية.
            </p>
          </div>

          {/* Categories Links */}
          <div className="md:col-span-4 space-y-4">
            <h3 className="text-sm font-bold text-white">الأقسام الرئيسية</h3>
            <ul className="space-y-2.5 text-sm text-zinc-400">
              {PRODUCT_CATEGORIES.filter((c) => c.id !== 'all').map((category) => (
                <li key={category.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory(category.id);
                      const el = document.getElementById('catalog');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    {category.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Direct WhatsApp Contact */}
          <div className="md:col-span-3 space-y-4">
            <h3 className="text-sm font-bold text-white">التواصل والطلبات</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              تواصل معنا مباشرة للاستفسار عن المقاسات، التوفر، والطلبات الخاصة.
            </p>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#18181B] hover:bg-[#DC2626] border border-white/10 hover:border-[#DC2626] rounded-lg transition-colors"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>محادثة واتساب</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={onWhatsappFallback}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#18181B] hover:bg-[#DC2626] border border-white/10 hover:border-[#DC2626] rounded-lg transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>محادثة واتساب</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Copyright + Subtle Owner Lock Icon */}
        <div className="pt-6 flex items-center justify-between gap-4 text-xs text-zinc-500">
          <p>
            © {new Date().getFullYear()} <span dir="ltr">BN_STONE</span>. جميع الحقوق محفوظة.
          </p>

          <button
            type="button"
            onClick={onOpenAdminLock}
            aria-label="دخول لوحة الإدارة"
            title="دخول الإدارة"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]"
          >
            <Lock className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
