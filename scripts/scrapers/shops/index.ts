import type { ShopAdapter } from "../types";
import { createWooCommerceAdapter } from "./woocommerce-generic";
import { createSchemaMicrodataAdapter } from "./schema-microdata-generic";
import { createReelCardAdapter } from "./reel-card-generic";
import { createDataAttrCardAdapter } from "./data-attr-card-generic";
import { createCatalogCardAdapter } from "./catalog-card-generic";
import { browserFetchHtml } from "../browser-fetch";
import { createBrainAdapter } from "./brain-adapter";

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
  // /g<id>-slug/ для групп товаров). Підтверджено реальним HTML з логів CI:
  // картка товару — `.catalogCard-box`, назва в aria-label посилання.
  // PLA-груп 404-ить під обома перевіреними варіантами URL — залишено лише
  // PETG, який точно відповідає 200.
  createCatalogCardAdapter({
    key: "ukr3d",
    meta: {
      slug: "ukr3d",
      name: "UKR3D",
      url: "https://ukr3d.com.ua",
      deliveryKyiv: true,
      deliveryUa: true,
    },
    fallbackBrand: "UKR3D",
    // Реальна схема пагінації (з логів CI): не query-параметр, а шлях-сегмент
    // `filter/page=N/`, характерний для Prom.ua.
    paginate: (base, page) => (page <= 1 ? base : `${base.replace(/\/$/, "")}/filter/page=${page}/`),
    categories: [{ url: "https://ukr3d.com.ua/g145752746-plastik-petg/", maxPages: 8 }],
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
    // Реальна схема пагінації (з логів CI): шлях-сегмент `page=N` без "?",
    // без слеша в кінці — `?page=N` сайт просто ігнорує й віддає 1-шу сторінку.
    paginate: (base, page) => (page <= 1 ? base : `${base}page=${page}`),
    categories: [{ url: "https://artline.ua/catalog/filamenty-i-smoly/", maxPages: 20 }],
  }),
  // Brain повертає HTTP 403 навіть із браузерним User-Agent при простому
  // fetch (повноцінний WAF) — рендеримо headless-браузером. Підтверджено
  // реальним HTML з логів CI: картка `.product-wrapper` несе аналітичні
  // data-атрибути (data-name/data-vendor/data-price/data-slug) прямо на собі.
  createBrainAdapter({
    key: "brain",
    meta: {
      slug: "brain",
      name: "Brain",
      url: "https://brain.com.ua",
      deliveryKyiv: true,
      deliveryUa: true,
    },
    // "Rashodniki_k_3D_pechati-c1804/filter=a1804-684/" (батьківська категорія
    // "витратні матеріали" + фасет a1804=684) — це той самий контент, що й
    // канонічна підкатегорія "Plastik_dlya_3D-printeriv-c684" ("пластик для
    // 3D-принтерів"), просто інша URL-форма: сама сторінка своїми
    // посиланнями пагінації веде саме на канонічну форму. Додавання
    // `page=N/` до відфільтрованого URL дає 404 — переходимо одразу на
    // канонічний шлях, де пагінація підтверджено працює.
    paginate: (base, page) => (page <= 1 ? base : `${base.replace(/\/$/, "")}/page=${page}/`),
    // Реальна межа каталогу видна прямо в пагінації сторінки 1 — серед
    // посилань є `page=102/` (типовий UI "1 2 3 ... остання"), тобто в
    // категорії ~102 * 48 ≈ 4900 товарів. Попередні ліміти (10, потім 40)
    // просто обрізали каталог задовго до кінця: на 40-й сторінці й далі
    // йшли повні 48 позицій. Цикл у run.ts і так зупиняється сам, щойно
    // сторінка повертає 0 позицій, тож запас із головою тут безкоштовний.
    categories: [
      { url: "https://brain.com.ua/ukr/category/Plastik_dlya_3D-printeriv-c684/", maxPages: 105 },
    ],
  }),
  // Те саме для Rozetka — HTTP 403 на простий fetch.
  {
    ...createSchemaMicrodataAdapter({
      key: "rozetka",
      meta: {
        slug: "rozetka",
        name: "Rozetka",
        url: "https://rozetka.com.ua",
        deliveryKyiv: true,
        deliveryUa: true,
      },
      fallbackBrand: "Rozetka",
      // Реальна схема пагінації (з логів CI): шлях-сегмент `page=N/`, не
      // query-параметр — `?page=N` сайт ігнорує й віддає 1-шу сторінку.
      paginate: (base, page) => (page <= 1 ? base : `${base.replace(/\/$/, "")}/page=${page}/`),
      categories: [
        { url: "https://rozetka.com.ua/ua/rashodnie-materiali-dlya-3d-printerov/c4671751/", maxPages: 20 },
      ],
    }),
    fetchPage: browserFetchHtml,
  },
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
