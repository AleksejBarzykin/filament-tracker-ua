import * as cheerio from "cheerio";
import type { CategoryTarget, RawListing, ShopAdapter, ShopMeta } from "../types";
import { extractDiameter, extractWeight, guessColor, parsePrice } from "../utils";

/**
 * Адаптер під розмітку ArtLine (підтверджено реальним HTML з логів CI):
 * картка товару — `.goods-card`, і сама несе GA4 ecommerce data-атрибути
 * прямо на собі — `data-name`, `data-price`, `data-brand` — тож не треба
 * розбирати вкладену розмітку заголовка/ціни, можна брати напряму з
 * атрибутів. Посилання — `a.goods-card__img`.
 */
export function createDataAttrCardAdapter(opts: {
  key: string;
  meta: ShopMeta;
  categories: CategoryTarget[];
  fallbackBrand: string;
  cardSelector?: string;
  paginate?: (base: string, page: number) => string;
}): ShopAdapter {
  const cardSelector = opts.cardSelector ?? ".goods-card";

  return {
    key: opts.key,
    meta: opts.meta,
    categories: opts.categories,
    paginate:
      opts.paginate ??
      ((base, page) => {
        if (page <= 1) return base;
        const url = new URL(base);
        url.searchParams.set("page", String(page));
        return url.toString();
      }),
    parseCategoryPage: (html, pageUrl) => {
      const $ = cheerio.load(html);
      const listings: RawListing[] = [];

      $(cardSelector).each((_, el) => {
        const $el = $(el);
        const title = $el.attr("data-name")?.trim();
        if (!title) return;

        const priceAttr = $el.attr("data-price");
        const price = parsePrice(priceAttr) ?? undefined;
        if (!price) return;

        let href = $el.find("a").first().attr("href") ?? "";
        if (href && !href.startsWith("http")) href = new URL(href, pageUrl).toString();
        if (!href) return;

        const brand = $el.attr("data-brand")?.trim() || opts.fallbackBrand;
        const outOfStock = /outofstock|немає в наявн|нема[єя] в наявн/i.test($el.text());
        const imageUrl = $el.find("img").first().attr("src");

        listings.push({
          brand,
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
