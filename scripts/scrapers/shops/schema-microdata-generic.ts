import * as cheerio from "cheerio";
import type { CategoryTarget, RawListing, ShopAdapter, ShopMeta } from "../types";
import { extractDiameter, extractWeight, guessBrand, guessColor, parsePrice } from "../utils";

/**
 * Крупные площадки (Rozetka, Brain, маркетплейсы) обычно рендерят каталог
 * через JS-фреймворк, но для SEO встраивают в HTML либо schema.org
 * микроразметку (itemscope/itemtype=".../Product") прямо в карточки товара,
 * либо JSON-LD <script type="application/ld+json"> блоки с @type Product /
 * ItemList. Этот адаптер пытается оба способа, не завязываясь на CSS-классы
 * конкретной темы (которые не удалось проверить вживую в этой среде —
 * нет доступа в интернет к сайтам магазинов).
 *
 * ВАЖНО: если площадка ничего не рендерит на сервере (чистый client-side
 * рендеринг без микроразметки и без JSON-LD), этот адаптер вернёт 0 позиций —
 * тогда нужен полноценный headless-browser скрапер (Playwright), это over
 * kill для регулярного крона и здесь не реализовано.
 */
export function createSchemaMicrodataAdapter(opts: {
  key: string;
  meta: ShopMeta;
  categories: CategoryTarget[];
  fallbackBrand: string;
  paginate?: (base: string, page: number) => string;
}): ShopAdapter {
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
      const seenUrls = new Set<string>();

      const pushListing = (raw: Omit<RawListing, "brand" | "color" | "diameterMm" | "weightG">) => {
        if (!raw.productUrl || seenUrls.has(raw.productUrl)) return;
        seenUrls.add(raw.productUrl);
        listings.push({
          ...raw,
          brand: guessBrand(raw.material, opts.fallbackBrand),
          color: guessColor(raw.material),
          diameterMm: extractDiameter(raw.material),
          weightG: extractWeight(raw.material),
        });
      };

      // 1) itemscope/itemtype microdata карточки
      $('[itemtype*="schema.org/Product"]').each((_, el) => {
        const $el = $(el);
        const title = $el.find('[itemprop="name"]').first().attr("content")
          || $el.find('[itemprop="name"]').first().text().trim();
        if (!title) return;

        let href = $el.is("a") ? $el.attr("href") : $el.find("a").first().attr("href");
        if (!href) return;
        if (!href.startsWith("http")) href = new URL(href, pageUrl).toString();

        const priceEl = $el.find('[itemprop="price"], [itemprop="lowPrice"]').first();
        const priceRaw = priceEl.attr("content") || priceEl.text();
        const price = parsePrice(priceRaw);
        if (!price) return;

        const availability = $el.find('[itemprop="availability"]').attr("href") || "";
        const inStock = !/outofstock/i.test(availability);
        const imageUrl = $el.find('[itemprop="image"]').first().attr("content")
          || $el.find('[itemprop="image"]').first().attr("src");

        pushListing({ material: title, productUrl: href, price, inStock, imageUrl });
      });

      // 2) JSON-LD <script type="application/ld+json">
      $('script[type="application/ld+json"]').each((_, el) => {
        const raw = $(el).contents().text();
        if (!raw) return;
        let data: unknown;
        try {
          data = JSON.parse(raw);
        } catch {
          return;
        }

        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const products = extractJsonLdProducts(item);
          for (const p of products) {
            const title = p.name;
            const href = p.url;
            const price = parsePrice(String(p.offers?.price ?? p.offers?.lowPrice ?? ""));
            if (!title || !href || !price) continue;
            const absoluteUrl = href.startsWith("http") ? href : new URL(href, pageUrl).toString();
            const availability = p.offers?.availability ?? "";
            const inStock = !/outofstock/i.test(String(availability));
            pushListing({
              material: title,
              productUrl: absoluteUrl,
              price,
              inStock,
              imageUrl: typeof p.image === "string" ? p.image : undefined,
            });
          }
        }
      });

      return listings;
    },
  };
}

type JsonLdProduct = {
  "@type"?: string;
  name?: string;
  url?: string;
  image?: unknown;
  offers?: { price?: string | number; lowPrice?: string | number; availability?: string };
};

function extractJsonLdProducts(node: unknown): JsonLdProduct[] {
  if (!node || typeof node !== "object") return [];
  const obj = node as Record<string, unknown>;
  const results: JsonLdProduct[] = [];

  const type = obj["@type"];
  const typeStr = Array.isArray(type) ? type.join(",") : String(type ?? "");
  if (typeStr.includes("Product")) {
    results.push(obj as JsonLdProduct);
  }

  const itemListElement = obj.itemListElement;
  if (Array.isArray(itemListElement)) {
    for (const entry of itemListElement) {
      const item = (entry as Record<string, unknown>)?.item ?? entry;
      results.push(...extractJsonLdProducts(item));
    }
  }

  return results;
}
