export interface ShopMeta {
  slug: string;
  name: string;
  url: string;
  logoUrl?: string;
  deliveryKyiv: boolean;
  deliveryUa: boolean;
}

export interface RawListing {
  brand: string;
  material: string;
  color: string;
  diameterMm: number;
  weightG: number;
  productUrl: string;
  price: number;
  oldPrice?: number;
  inStock: boolean;
  imageUrl?: string;
}

export interface CategoryTarget {
  url: string;
  /** сколько страниц пагинации пробовать (?page=2, ?page=3, ...) */
  maxPages?: number;
}

export interface ShopAdapter {
  key: string;
  meta: ShopMeta;
  categories: CategoryTarget[];
  /** Строит URL следующей страницы пагинации для категории. */
  paginate: (base: string, page: number) => string;
  /** Парсит HTML страницы категории/каталога в список позиций. */
  parseCategoryPage: (html: string, pageUrl: string) => RawListing[];
}
