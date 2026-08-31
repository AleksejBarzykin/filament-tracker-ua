import type { ShopAdapter } from "../types";
import { createWooCommerceAdapter } from "./woocommerce-generic";
import { createSchemaMicrodataAdapter } from "./schema-microdata-generic";
import { createReelCardAdapter } from "./reel-card-generic";
import { createDataAttrCardAdapter } from "./data-attr-card-generic";

/**
 * Реестр адаптеров магазинов и площадок. Категории/URL ниже свёрены с
 * реальными страницами через веб-поиск (в этой среде разработки нет прямого
 * доступа в интернет к самим сайтам магазинов, поэтому вживую HTML не
 * проверялся) — при первом реальном запуске (`npm run scrape` в среде с
 * доступом в сеть, например GitHub Actions) смотри в лог на `-> 0 listings`
 * по конкретному магазину и поправляй селекторы/URL под него.
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
      { url: "https://shop.plexiwire.com.ua/pla-filament/", maxPages: 3 },
      { url: "https://shop.plexiwire.com.ua/petg-filament/", maxPages: 3 },
      { url: "https://shop.plexiwire.com.ua/abs-filament/", maxPages: 2 },
      { url: "https://shop.plexiwire.com.ua/asa-filament/", maxPages: 2 },
    ],
  }),
  // Підтверджено реальним HTML з логів CI: 3dplastic.com.ua на головній
  // рендерить картки товару як article.reel (не WooCommerce, не schema.org).
  createReelCardAdapter({
    key: "3dplastic",
    meta: {
      slug: "3dplastic",
      name: "3DPlastic",
      url: "https://www.3dplastic.com.ua",
      deliveryKyiv: true,
      deliveryUa: true,
    },
    fallbackBrand: "3DPlastic",
    categories: [{ url: "https://www.3dplastic.com.ua/", maxPages: 1 }],
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
    categories: [{ url: "https://filament-shop.in.ua/", maxPages: 1 }],
  }),
  // UKR3D работает на платформе Prom.ua (характерные URL вида
  // /g<id>-slug/ для групп товаров) — Prom-витрины обычно тоже отдают
  // schema.org микроразметку карточек товара для SEO.
  createSchemaMicrodataAdapter({
    key: "ukr3d",
    meta: {
      slug: "ukr3d",
      name: "UKR3D",
      url: "https://ukr3d.com.ua",
      deliveryKyiv: true,
      deliveryUa: true,
    },
    fallbackBrand: "UKR3D",
    categories: [
      { url: "https://ukr3d.com.ua/g145708343-pla-plastik-dlya/", maxPages: 3 },
      { url: "https://ukr3d.com.ua/g145752746-plastik-petg/", maxPages: 3 },
    ],
  }),
  // Підтверджено реальним HTML з логів CI: картка `.goods-card` несе GA4
  // ecommerce data-атрибути (data-name/data-price/data-brand) прямо на собі.
  createDataAttrCardAdapter({
    key: "artline",
    meta: {
      slug: "artline",
      name: "ArtLine",
      url: "https://artline.ua",
      deliveryKyiv: true,
      deliveryUa: true,
    },
    fallbackBrand: "ArtLine",
    categories: [{ url: "https://artline.ua/catalog/filamenty-i-smoly/", maxPages: 4 }],
  }),
  createSchemaMicrodataAdapter({
    key: "brain",
    meta: {
      slug: "brain",
      name: "Brain",
      url: "https://brain.com.ua",
      deliveryKyiv: true,
      deliveryUa: true,
    },
    fallbackBrand: "Brain",
    categories: [
      { url: "https://brain.com.ua/category/Rashodniki_k_3D_pechati-c1804/filter=a1804-684/", maxPages: 3 },
    ],
  }),
  createSchemaMicrodataAdapter({
    key: "rozetka",
    meta: {
      slug: "rozetka",
      name: "Rozetka",
      url: "https://rozetka.com.ua",
      deliveryKyiv: true,
      deliveryUa: true,
    },
    fallbackBrand: "Rozetka",
    categories: [
      { url: "https://rozetka.com.ua/ua/rashodnie-materiali-dlya-3d-printerov/c4671751/", maxPages: 3 },
    ],
  }),
  // OLX — дошки оголошень, а не магазин: у більшості оголошень немає
  // структурованої Product-розмітки, тож цей адаптер, найімовірніше,
  // повертатиме 0 позицій, поки не буде написаний окремий парсер під
  // конкретну вёрстку оголошення. Залишено як заготовку на прохання
  // користувача відстежувати й OLX.
  createSchemaMicrodataAdapter({
    key: "olx",
    meta: {
      slug: "olx",
      name: "OLX",
      url: "https://www.olx.ua",
      deliveryKyiv: true,
      deliveryUa: true,
    },
    fallbackBrand: "OLX",
    categories: [
      {
        url: "https://www.olx.ua/uk/elektronika/kompyutery-i-komplektuyuschie/q-%D0%BF%D0%BB%D0%B0%D1%81%D1%82%D0%B8%D0%BA-%D0%B4%D0%BB%D1%8F-3%D0%B4-%D0%BF%D1%80%D0%B8%D0%BD%D1%82%D0%B5%D1%80%D0%B0/",
        maxPages: 2,
      },
    ],
  }),
];
