import * as cheerio from "cheerio";
import type { CategoryTarget, RawListing, ShopAdapter, ShopMeta } from "../types";
import { extractDiameter, extractWeight, guessBrand, guessColor, parsePrice } from "../utils";

/**
 * Адаптер під розмітку UKR3D (підтверджено реальним HTML з логів CI):
 * картка товару — `.catalogCard-box`, назва — `aria-label` на
 * `a.catalogCard-image` (посилання там же, href). Точний клас ціни не
 * підтверджений вживу — шукаємо будь-який елемент з "price" у класі, а якщо
 * не знайдено, витягуємо перше число перед "грн"/"₴" у тексті картки.
 */
export function createCatalogCardAdapter(opts: {
  key: string;
  meta: ShopMeta;
  categories: CategoryTarget[];
  fallbackBrand: string;
}): ShopAdapter {
  return {
    key: opts.key,
    meta: opts.meta,
    categories: opts.categories,
    paginate: (base, page) => {
      if (page <= 1) return base;
      const url = new URL(base);
      url.searchParams.set("page", String(page));
      return url.toString();
    },
    parseCategoryPage: (html, pageUrl) => {
      const $ = cheerio.load(html);
      const listings: RawListing[] = [];

      $(".catalogCard-box").each((_, el) => {
        const $el = $(el);
        const linkEl = $el.find("a.catalogCard-image, a[aria-label]").first();
        const title = linkEl.attr("aria-label")?.trim();
        if (!title) return;

        let href = linkEl.attr("href") ?? "";
        if (href && !href.startsWith("http")) href = new URL(href, pageUrl).toString();
        if (!href) return;

        const priceEl = $el.find('[class*="price"]').filter((_, p) => /\d/.test($(p).text()));
        let price = parsePrice(priceEl.first().text());
        if (!price) {
          const textMatch = $el.text().match(/(\d[\d\s]{1,7})\s*(?:грн|₴)/i);
          price = textMatch ? parsePrice(textMatch[1]) : undefined;
        }
        if (!price) return;

        const outOfStock = /нема[єя] в наявн|немає в наявн|out of stock/i.test($el.text());
        const imageUrl = $el.find("img").first().attr("src");

        listings.push({
          brand: guessBrand(title, opts.fallbackBrand),
          material: title,
          color: guessColor(title),
          diameterMm: extractDiameter(title),
          weightG: extractWeight(title),
          productUrl: href,
          price,
          inStock: !outOfStock,
          imageUrl: imageUrl ? new URL(imageUrl, pageUrl).toString() : undefined,
        });
      });

      return listings;
    },
  };
}
