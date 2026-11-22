import { useState } from 'react';
import { Menu, MessageCircle, X } from 'lucide-react';
import { DEFAULT_WHATSAPP_PHONE, type CategoryFilter, type StoreSettings } from '../types';
import { buildWhatsappUrl } from '../utils/catalog';

interface HeaderProps {
  settings: StoreSettings;
  onNavigateHome: () => void;
  onSelectCategory: (category: CategoryFilter) => void;
  onWhatsappFallback: () => void;
}

export function Header({
  settings,
  onNavigateHome,
  onSelectCategory,
  onWhatsappFallback,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const whatsappUrl = buildWhatsappUrl(
    settings.whatsappPhone || DEFAULT_WHATSAPP_PHONE,
    'مرحباً متجر BN_STONE، أرغب بالاستفسار عن إكسسوارات الدراجات النارية.'
  );

  const handleLinkClick = (sectionId: string, category?: CategoryFilter) => {
    setMobileMenuOpen(false);
    onNavigateHome();
    if (category) {
      onSelectCategory(category);
    }
    requestAnimationFrame(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#09090B]/92 backdrop-blur-md border-b border-white/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            onNavigateHome();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-2.5 text-white whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] rounded"
          aria-label="BN_STONE الرئيسية"
        >
          <span
            className="w-1.5 h-6 bg-[#DC2626] -skew-x-12 inline-block shrink-0"
            aria-hidden="true"
          />
          <span
            dir="ltr"
            className="font-brand text-2xl sm:text-[1.65rem] font-extrabold tracking-[0.14em] leading-none"
          >
            BN<span className="text-[#DC2626]">_</span>STONE
          </span>
        </button>

        {/* Zone 2: 4 clean single-line navigation links */}
        <nav
          aria-label="التنقل الرئيسي"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-300"
        >
          <button
            type="button"
            onClick={() => handleLinkClick('hero')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b border-transparent hover:border-[#DC2626]"
          >
            الرئيسية
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('catalog', 'all')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b border-transparent hover:border-[#DC2626]"
          >
            المنتجات
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('catalog', 'helmets')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b border-transparent hover:border-[#DC2626]"
          >
            الخوذات
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('standards')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b border-transparent hover:border-[#DC2626]"
          >
            معاييرنا
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#EF4444] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              <span>تواصل واتساب</span>
            </a>
          ) : (
            <button
              type="button"
              onClick={onWhatsappFallback}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#EF4444] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              <span>تواصل واتساب</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-zinc-200 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/8 bg-[#0D0D10] px-4 py-4 space-y-1">
          <button
            type="button"
            onClick={() => handleLinkClick('hero')}
            className="block w-full text-right px-3 py-3 text-base font-medium text-zinc-200 hover:text-white hover:bg-white/5 rounded-lg"
          >
            الرئيسية
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('catalog', 'all')}
            className="block w-full text-right px-3 py-3 text-base font-medium text-zinc-200 hover:text-white hover:bg-white/5 rounded-lg"
          >
            المنتجات
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('catalog', 'helmets')}
            className="block w-full text-right px-3 py-3 text-base font-medium text-zinc-200 hover:text-white hover:bg-white/5 rounded-lg"
          >
            الخوذات
          </button>
          <button
            type="button"
            onClick={() => handleLinkClick('standards')}
            className="block w-full text-right px-3 py-3 text-base font-medium text-zinc-200 hover:text-white hover:bg-white/5 rounded-lg"
          >
            معاييرنا
          </button>
          <div className="pt-3 border-t border-white/8">
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#EF4444] rounded-lg transition-colors"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>تواصل واتساب</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onWhatsappFallback();
                }}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#EF4444] rounded-lg transition-colors"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                <span>تواصل واتساب</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
