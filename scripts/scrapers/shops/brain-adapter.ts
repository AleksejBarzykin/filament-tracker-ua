import * as cheerio from "cheerio";
import type { CategoryTarget, RawListing, ShopAdapter, ShopMeta } from "../types";
import { browserFetchHtml } from "../browser-fetch";
import { extractDiameter, extractWeight, guessColor, parsePrice } from "../utils";

/**
 * Адаптер під розмітку Brain.com.ua (підтверджено реальним HTML з логів CI,
 * отриманим через headless-browser — простий fetch блокується WAF з HTTP
 * 403). Картка товару — `.product-wrapper`, і несе GA4/аналітичні
 * data-атрибути прямо на собі: data-name, data-vendor (бренд), data-price,
 * data-without-discount-price (стара ціна), data-slug (без домену й
 * розширення — реальний URL збирається як
 * https://brain.com.ua/ukr/<data-slug>.html), data-stock ("1" — в наявності).
 */
export function createBrainAdapter(opts: {
  key: string;
  meta: ShopMeta;
  categories: CategoryTarget[];
  paginate?: (base: string, page: number) => string;
}): ShopAdapter {
  return {
    key: opts.key,
    meta: opts.meta,
    categories: opts.categories,
    fetchPage: browserFetchHtml,
    paginate:
      opts.paginate ??
      ((base, page) => {
        if (page <= 1) return base;
        const url = new URL(base);
        url.searchParams.set("page", String(page));
        return url.toString();
      }),
    parseCategoryPage: (html) => {
      const $ = cheerio.load(html);
      const listings: RawListing[] = [];

      $(".product-wrapper").each((_, el) => {
        const $el = $(el);
        const title = $el.attr("data-name")?.trim();
        const slug = $el.attr("data-slug")?.trim();
        if (!title || !slug) return;

        const price = parsePrice($el.attr("data-price"));
        if (!price) return;

        const oldPrice = parsePrice($el.attr("data-without-discount-price"));
        const brand = $el.attr("data-vendor")?.trim() || "Brain";
        const productUrl = `https://brain.com.ua/ukr/${slug}.html`;
        const inStock = $el.attr("data-stock") !== "0";
        const imageUrl = $el.find("img").first().attr("src") || $el.find("img").first().attr("data-src");

        listings.push({
          brand,
          material: title,
          color: guessColor(title),
          diameterMm: extractDiameter(title),
          weightG: extractWeight(title),
          productUrl,
          price,
          oldPrice: oldPrice && oldPrice > price ? oldPrice : undefined,
          inStock,
          imageUrl,
        });
      });

      return listings;
    },
  };
}
