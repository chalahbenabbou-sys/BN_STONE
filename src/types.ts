export type ProductCategory = 'helmets' | 'gloves' | 'jackets' | 'accessories';

export type CategoryFilter = 'all' | ProductCategory;

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: ProductCategory;
  imageUrl: string;
  published: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  source?: 'firestore' | 'server';
}

export interface ProductInput {
  name: string;
  price: number;
  description: string;
  category: ProductCategory;
  imageUrl: string;
  published: boolean;
}

export interface StoreSettings {
  whatsappPhone: string;
  currency: string;
  storeName: string;
  updatedAt?: string;
}

export interface CategoryMeta {
  id: CategoryFilter;
  label: string;
  shortLabel: string;
}

export const PRODUCT_CATEGORIES: CategoryMeta[] = [
  { id: 'all', label: 'جميع المنتجات', shortLabel: 'الكل' },
  { id: 'helmets', label: 'خوذات الدراجات', shortLabel: 'خوذات' },
  { id: 'gloves', label: 'قفازات الحماية', shortLabel: 'قفازات' },
  { id: 'jackets', label: 'سترات الدراجين', shortLabel: 'سترات' },
  { id: 'accessories', label: 'إكسسوارات ومعدات', shortLabel: 'إكسسوارات ومعدات' },
];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  helmets: 'خوذات',
  gloves: 'قفازات',
  jackets: 'سترات',
  accessories: 'إكسسوارات ومعدات',
};

export const HERO_IMAGE_URL = '/src/assets/images/hero_motorcycle_banner_1795308369400.jpg';
export const DEFAULT_WHATSAPP_PHONE = '+212763941307';

export const DEFAULT_SEED_PRODUCTS: Omit<Product, 'createdAt' | 'updatedAt' | 'source'>[] = [
  {
    id: 'bn-helmet-carbon-pro',
    name: 'خوذة BN_STONE كربون فايبر برو للسباق',
    price: 2450,
    category: 'helmets',
    imageUrl: '/src/assets/images/product_helmet_carbon_1795308369657.jpg',
    published: true,
    description:
      'خوذة سباق احترافية مصنوعة بالكامل من ألياف الكربون المطروق خفيف الوزن مع واقي شمسي داكن مقاوم للخدش والضباب. مصممة بنظام تهوية ديناميكي هوائي عالي الكفاءة وبطانة داخلية مضادة للبكتيريا قابلة للفك والغسيل، وتلبي أعلى معايير السلامة الأوروبية ECE 22.06.',
  },
  {
    id: 'bn-gloves-apex-leather',
    name: 'قفازات Apex جلد طبيعي بحماية كربون',
    price: 540,
    category: 'gloves',
    imageUrl: '/src/assets/images/product_gloves_leather_1795308369091.jpg',
    published: true,
    description:
      'قفازات قيادة رياضية من الجلد الطبيعي الفاخر المعزز بحماية مفاصل من الكربون فايبر وخياطة مزدوجة باللون الأحمر القرمزي. تمنحك ثباتاً فائقاً على المقود مع تهوية دقيقة للأصابع وإغلاق مزدوج للمعصم لثبات كامل في السرعات العالية.',
  },
  {
    id: 'bn-jacket-obsidian-armor',
    name: 'سترة Obsidian الجلدية المدرعة للقيادة',
    price: 1890,
    category: 'jackets',
    imageUrl: '/src/assets/images/product_jacket_armored_1795308368972.jpg',
    published: true,
    description:
      'سترة جلدية فاخرة مثقبة للتهوية مزودة بدروع حماية معتمدة (CE المستوى الثاني) للكتفين والمرفقين والظهر مع منزلقات كربون خارجية على الكتف. تجمع بين الأناقة السوداء المطفية والحماية القصوى للرحلات الطويلة والقيادة الرياضية.',
  },
  {
    id: 'bn-exhaust-titanium-slipon',
    name: 'كاتم عادم تيتانيوم وكربون فايبر رياضي',
    price: 3150,
    category: 'accessories',
    imageUrl: '/src/assets/images/product_exhaust_accessory_1795308369148.jpg',
    published: true,
    description:
      'نظام عادم Slip-On مصنوع بدقة من التيتانيوم المصقول وفوهة من الكربون فايبر الحقيقي بحلقة تثبيت حمراء مؤكسدة. يخفف وزن الدراجة بشكل ملحوظ ويمنحك نغمة صوتية عميقة واستجابة محرك أكثر سلاسة.',
  },
  {
    id: 'bn-boots-vortex-track',
    name: 'حذاء Vortex المدرع للسباق والرحلات',
    price: 1380,
    category: 'accessories',
    imageUrl: '/src/assets/images/product_boots_riding_1795308370328.jpg',
    published: true,
    description:
      'حذاء قيادة احترافي مزود بدعامة كاحل مفصلية مقاومة للالتواء باللون الأحمر ومنزلقات تيتانيوم أمامية قابلة للاستبدال. يوفر توازناً مثالياً بين الصلابة الواقية والمرونة أثناء تبديل السرعات والقيادة اليومية.',
  },
  {
    id: 'bn-intercom-cnc-kit',
    name: 'جهاز اتصال بلوتوث للخوذة مع حامل CNC',
    price: 820,
    category: 'accessories',
    imageUrl: '/src/assets/images/product_intercom_gear_1795308368349.jpg',
    published: true,
    description:
      'طقم متكامل يضم جهاز اتصال بلوتوث مقاوم للماء بعزل ضوضاء الرياح ومكالمات جماعية صافية، مع حامل مقود من الألمنيوم المشغول CNC بحلقة قفل حمراء مضادة للاهتزاز لتثبيت هاتفك بأمان تام.',
  },
];
