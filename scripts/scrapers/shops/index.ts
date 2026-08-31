import type { ShopAdapter } from "../types";
import { createWooCommerceAdapter } from "./woocommerce-generic";

/**
 * Реестр адаптеров магазинов. Каждый адаптер целится в 1-2 широких страницы
 * каталога (все филаменты) вместо точных категорий по материалу — материал,
 * бренд и цвет извлекаются из названия товара (см. utils.ts). Так адаптер
 * меньше зависит от точной структуры категорий конкретного магазина, которую
 * не удалось проверить вживую из этой среды (нет доступа в интернет к сайтам
 * магазинов). Селекторы карточек товара нужно свериться и поправить при
 * первом реальном запуске через `npm run scrape` в среде с доступом в сеть
 * (например, в GitHub Actions).
 */
export const shopAdapters: ShopAdapter[] = [
  createWooCommerceAdapter({
    key: "plexiwire",
    meta: {
      slug: "plexiwire",
      name: "Plexiwire",
      url: "https://shop.plexiwire.com.ua",
      deliveryKyiv: true,
      deliveryUa: true,
    },
    fallbackBrand: "Plexiwire",
    categories: [
      { url: "https://shop.plexiwire.com.ua/ru/pla-filament/", maxPages: 3 },
      { url: "https://shop.plexiwire.com.ua/ru/petg-filament/", maxPages: 3 },
      { url: "https://shop.plexiwire.com.ua/ru/abs-filament/", maxPages: 2 },
    ],
  }),
  createWooCommerceAdapter({
    key: "3dplastic",
    meta: {
      slug: "3dplastic",
      name: "3DPlastic",
      url: "https://www.3dplastic.com.ua",
      deliveryKyiv: true,
      deliveryUa: true,
    },
    fallbackBrand: "3DPlastic",
    categories: [{ url: "https://www.3dplastic.com.ua/ua/katalog", maxPages: 3 }],
  }),
  createWooCommerceAdapter({
    key: "filament-shop",
    meta: {
      slug: "filament-shop",
      name: "Filament-Shop.in.ua",
      url: "https://filament-shop.in.ua",
      deliveryKyiv: true,
      deliveryUa: true,
    },
    fallbackBrand: "Filament-Shop",
    categories: [{ url: "https://filament-shop.in.ua/katalog/", maxPages: 3 }],
  }),
  createWooCommerceAdapter({
    key: "ukr3d",
    meta: {
      slug: "ukr3d",
      name: "UKR3D",
      url: "https://ukr3d.com.ua",
      deliveryKyiv: true,
      deliveryUa: true,
    },
    fallbackBrand: "UKR3D",
    categories: [{ url: "https://ukr3d.com.ua/ru/plastik-dlya-3d-pechati/", maxPages: 3 }],
  }),
  createWooCommerceAdapter({
    key: "artline",
    meta: {
      slug: "artline",
      name: "ArtLine",
      url: "https://artline.ua",
      deliveryKyiv: true,
      deliveryUa: true,
    },
    fallbackBrand: "ArtLine",
    categories: [{ url: "https://artline.ua/catalog/filamenty-i-smoly", maxPages: 4 }],
  }),
];
