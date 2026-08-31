import { PrismaClient } from "@prisma/client";
import { shopAdapters } from "./shops";
import { fetchHtml } from "./utils";
import { normalizeMaterial } from "../../src/lib/materials";
import type { RawListing } from "./types";

const prisma = new PrismaClient();

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
        if (listings.length === 0) break; // конец пагинации или сломанные селекторы

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
