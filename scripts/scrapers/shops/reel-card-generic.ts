import * as cheerio from "cheerio";
import type { CategoryTarget, RawListing, ShopAdapter, ShopMeta } from "../types";
import { extractDiameter, extractWeight, guessBrand, guessColor, parsePrice } from "../utils";

/**
 * Адаптер під розмітку 3dplastic.com.ua (підтверджено реальним HTML з логів
 * CI): картка товару — `article.reel`, заголовок — `.reel__body h3 a`,
 * ціна — `.reel__price` (текст типу "750 грн."), посилання відносне.
 */
export function createReelCardAdapter(opts: {
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

      $("article.reel").each((_, el) => {
        const $el = $(el);
        const titleEl = $el.find(".reel__body h3 a").first();
        const title = titleEl.text().trim();
        if (!title) return;

        let href = titleEl.attr("href") ?? "";
        if (href && !href.startsWith("http")) href = new URL(href, pageUrl).toString();
        if (!href) return;

        const price = parsePrice($el.find(".reel__price").first().text());
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
