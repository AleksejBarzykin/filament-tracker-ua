import { PrismaClient } from "@prisma/client";
import { shopAdapters } from "./shops";
import { fetchHtml } from "./utils";
import { normalizeMaterial } from "../../src/lib/materials";
import type { RawListing } from "./types";

const prisma = new PrismaClient();

/**
 * Коли адаптер не знайшов жодної позиції на сторінці, друкуємо шматок
 * реального HTML у лог CI — це єдиний спосіб побачити справжню розмітку
 * магазину (з локального середовища розробки немає доступу в інтернет до
 * самих сайтів), щоб полагодити селектори за фактом, а не навмання.
 */
function logHtmlDebug(url: string, html: string) {
  console.log(`  [debug] ${url} length=${html.length}`);
  const hasPriceWord = /грн|₴/i.test(html);
  const productWordCount = (html.match(/product/gi) ?? []).length;
  console.log(`  [debug] contains "грн/₴": ${hasPriceWord}, "product" occurrences: ${productWordCount}`);

  // Друкуємо ширший фрагмент навколо першої картки товару (шукаємо типові
  // маркери контейнера картки), щоб побачити title+link+price разом, а не
  // лише перше згадування ціни (яке часто потрапляє на кошик/хедер).
  const cardMarkers = [
    /class="[^"]*goods-card[^"]*"/i,
    /class="[^"]*product-item[^"]*"/i,
    /class="[^"]*products-list[^"]*"/i,
    /class="[^"]*catalog-item[^"]*"/i,
  ];
  let printedCard = false;
  for (const marker of cardMarkers) {
    const idx = html.search(marker);
    if (idx >= 0) {
      console.log(`  [debug] snippet around card marker ${marker}:\n${html.slice(idx, idx + 1400)}`);
      printedCard = true;
      break;
    }
  }

  const priceIdx = html.search(/грн|₴/i);
  if (priceIdx >= 0) {
    const start = Math.max(0, priceIdx - 400);
    console.log(`  [debug] snippet around first price mention:\n${html.slice(start, priceIdx + 200)}`);
  } else if (!printedCard) {
    console.log(`  [debug] head snippet:\n${html.slice(0, 800)}`);
  }
}

async function findOrCreateFilament(raw: RawListing) {
  const material = normalizeMaterial(raw.material);
  const brand = raw.brand.trim();
  const color = raw.color.trim() || "не вказано";

  const existing = await prisma.filament.findFirst({
    where: { brand, material, color, diameterMm: raw.diameterMm, weightG: raw.weightG },
  });
  if (existing) return existing;

  return prisma.filament.create({
    data: { brand, material, color, diameterMm: raw.diameterMm, weightG: raw.weightG, imageUrl: raw.imageUrl },
  });
}

async function upsertListing(shopId: string, filamentId: string, raw: RawListing) {
  const discountPct =
    raw.oldPrice && raw.oldPrice > raw.price
      ? Math.round(((raw.oldPrice - raw.price) / raw.oldPrice) * 100)
      : null;

  const listing = await prisma.listing.upsert({
    where: { shopId_productUrl: { shopId, productUrl: raw.productUrl } },
    update: {
      currentPrice: raw.price,
      oldPrice: raw.oldPrice ?? null,
      inStock: raw.inStock,
      discountPct,
      filamentId,
    },
    create: {
      shopId,
      filamentId,
      productUrl: raw.productUrl,
      currentPrice: raw.price,
      oldPrice: raw.oldPrice ?? null,
      inStock: raw.inStock,
      discountPct,
    },
  });

  await prisma.priceHistory.create({
    data: { listingId: listing.id, price: raw.price, inStock: raw.inStock },
  });

  return listing;
}

async function main() {
  const only = process.argv[2];
  const adapters = only ? shopAdapters.filter((a) => a.key === only) : shopAdapters;
  if (only && adapters.length === 0) {
    console.error(`Unknown shop key "${only}". Available: ${shopAdapters.map((a) => a.key).join(", ")}`);
    process.exit(1);
  }

  for (const adapter of adapters) {
    console.log(`\n=== ${adapter.meta.name} (${adapter.key}) ===`);

    const shop = await prisma.shop.upsert({
      where: { slug: adapter.meta.slug },
      update: { lastScrapedAt: new Date() },
      create: {
        slug: adapter.meta.slug,
        name: adapter.meta.name,
        url: adapter.meta.url,
        logoUrl: adapter.meta.logoUrl,
        deliveryKyiv: adapter.meta.deliveryKyiv,
        deliveryUa: adapter.meta.deliveryUa,
        scraperKey: adapter.key,
        lastScrapedAt: new Date(),
      },
    });

    let totalListings = 0;

    for (const category of adapter.categories) {
      const maxPages = category.maxPages ?? 1;
      for (let page = 1; page <= maxPages; page++) {
        const url = adapter.paginate(category.url, page);
        const html = await fetchHtml(url);
        if (!html) {
          console.warn(`  [skip] failed to fetch ${url}`);
          break;
        }

        const listings = adapter.parseCategoryPage(html, url);
        console.log(`  ${url} -> ${listings.length} listings`);
        if (listings.length === 0) {
          if (page === 1) logHtmlDebug(url, html);
          break; // конец пагинації або зламані селектори
        }

        for (const raw of listings) {
          try {
            const filament = await findOrCreateFilament(raw);
            await upsertListing(shop.id, filament.id, raw);
            totalListings++;
          } catch (err) {
            console.warn(`  [error] ${raw.productUrl}:`, (err as Error).message);
          }
        }
      }
    }

    console.log(`  total saved: ${totalListings}`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
