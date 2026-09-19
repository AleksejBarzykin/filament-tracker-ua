import * as cheerio from "cheerio";
import type { CategoryTarget, RawListing, ShopAdapter, ShopMeta } from "../types";
import { extractDiameter, extractWeight, guessBrand, guessColor, parsePrice } from "../utils";

/**
 * Многие небольшие украинские магазины 3D-расходников работают на WooCommerce
 * (WordPress). Разметка каталога у них похожа: карточка товара — li.product /
 * div.product, заголовок — h2/h3.woocommerce-loop-product__title или .product-title,
 * цена — span.price (внутри может быть <del> старая и <ins> новая), ссылка — сам
 * товар или .woocommerce-LoopProduct-link.
 *
 * ВАЖНО: этот адаптер собран по типовой разметке темы Storefront/аналогов без
 * возможности проверить реальный HTML магазина (в этой среде нет доступа в
 * интернет к сайтам магазинов). При первом реальном запуске (в GitHub Actions,
 * где интернет открыт) стоит свериться с логами `parsed 0 listings` и при
 * необходимости поправить селекторы под конкретную тему магазина.
 */
export function createWooCommerceAdapter(opts: {
  key: string;
  meta: ShopMeta;
  categories: CategoryTarget[];
  fallbackBrand: string;
  /** Дополнительные селекторы карточки товара, специфичные для темы магазина. */
  cardSelector?: string;
}): ShopAdapter {
  const cardSelector =
    opts.cardSelector ?? "li.product, div.product, .products .type-product, .product-item";

  return {
    key: opts.key,
    meta: opts.meta,
    categories: opts.categories,
    paginate: (base, page) => {
      if (page <= 1) return base;
      const url = new URL(base);
      url.searchParams.set("paged", String(page));
      return url.toString();
    },
    parseCategoryPage: (html, pageUrl) => {
      const $ = cheerio.load(html);
      const listings: RawListing[] = [];

      $(cardSelector).each((_, el) => {
        const $el = $(el);
        const titleEl = $el
          .find(
            "h2.woocommerce-loop-product__title, h3.woocommerce-loop-product__title, .product-title, h2, h3, .woocommerce-loop-product__title"
          )
          .first();
        const title = titleEl.text().trim();
        if (!title) return;

        const linkEl = $el.find("a.woocommerce-LoopProduct-link, a").first();
        let href = linkEl.attr("href") ?? "";
        if (href && !href.startsWith("http")) {
          href = new URL(href, pageUrl).toString();
        }
        if (!href) return;

        const priceText = $el.find(".price ins .amount, .price ins").first().text().trim();
        const currentPriceText = priceText || $el.find(".price .amount, .price").first().text().trim();
        const oldPriceText = $el.find(".price del .amount, .price del").first().text().trim();

        const price = parsePrice(currentPriceText);
        if (!price) return;
        const oldPrice = parsePrice(oldPriceText);

        const outOfStock =
          $el.hasClass("outofstock") ||
          $el.find(".outofstock, .out-of-stock").length > 0 ||
          /нема[єя] в наявн|немає в наявн|out of stock|под замовлення/i.test($el.text());

        const imageUrl = $el.find("img").first().attr("src") || undefined;

        listings.push({
          brand: guessBrand(title, opts.fallbackBrand),
          material: title,
          color: guessColor(title),
          diameterMm: extractDiameter(title),
          weightG: extractWeight(title),
          productUrl: href,
          price,
          oldPrice: oldPrice && oldPrice > price ? oldPrice : undefined,
          inStock: !outOfStock,
          imageUrl,
        });
      });

      return listings;
    },
  };
}
