import { ArrowUpLeft } from 'lucide-react';
import { CATEGORY_LABELS, type Product } from '../types';
import { formatPrice } from '../utils/catalog';
import { SafeImage } from './SafeImage';

interface ProductCardProps {
  product: Product;
  currency: string;
  onSelect: (product: Product) => void;
}

export function ProductCard({ product, currency, onSelect }: ProductCardProps) {
  return (
    <article className="group bg-[#121215] border border-white/8 hover:border-[#DC2626]/50 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 flex flex-col">
      <button
        type="button"
        onClick={() => onSelect(product)}
        className="text-right flex flex-col flex-1 w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#DC2626]"
        aria-label={`عرض تفاصيل ${product.name}`}
      >
        {/* 4:3 Studio Product Image Container */}
        <div className="relative aspect-[4/3] w-full bg-[#18181B] overflow-hidden border-b border-white/6">
          <SafeImage
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        </div>

        {/* Clean Uniform Metadata (Zero Pills) */}
        <div className="p-5 flex flex-col flex-1 justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-400">
              {CATEGORY_LABELS[product.category]}
            </p>
            <h3 className="text-base sm:text-lg font-bold font-display text-white leading-snug line-clamp-2 group-hover:text-[#EF4444] transition-colors">
              {product.name}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2">
              {product.description}
            </p>
          </div>

          <div className="pt-3 border-t border-white/6 flex items-center justify-between gap-3">
            <span className="font-brand text-xl font-bold text-white tabular-nums tracking-wide">
              {formatPrice(product.price, currency)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-300 group-hover:text-[#EF4444] transition-colors whitespace-nowrap shrink-0">
              <span>التفاصيل</span>
              <ArrowUpLeft className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </button>
    </article>
  );
}
