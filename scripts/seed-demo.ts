/**
 * Демо-сидирование БД реалистичными данными.
 *
 * Живой скрапинг реальных магазинов (npm run scrape) требует выхода в
 * интернет к сайтам магазинов, которого нет в этой среде разработки —
 * запусти его в GitHub Actions (см. .github/workflows/scrape.yml) или на
 * своей машине. Этот скрипт наполняет БД правдоподобным набором
 * позиций/цен/истории, чтобы сайт можно было разрабатывать и показывать уже
 * сейчас; при первом реальном скрапинге реальные листинги лягут поверх (или
 * рядом) по тем же магазинам.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const shops = [
  { slug: "plexiwire", name: "Plexiwire", url: "https://shop.plexiwire.com.ua", scraperKey: "plexiwire" },
  { slug: "3dplastic", name: "3DPlastic", url: "https://www.3dplastic.com.ua", scraperKey: "3dplastic" },
  { slug: "filament-shop", name: "Filament-Shop.in.ua", url: "https://filament-shop.in.ua", scraperKey: "filament-shop" },
  { slug: "ukr3d", name: "UKR3D", url: "https://ukr3d.com.ua", scraperKey: "ukr3d" },
  { slug: "artline", name: "ArtLine", url: "https://artline.ua", scraperKey: "artline" },
] as const;

type SeedFilament = {
  brand: string;
  material: string;
  color: string;
  diameterMm: number;
  weightG: number;
  offers: { shop: (typeof shops)[number]["slug"]; price: number; oldPrice?: number; inStock?: boolean }[];
};

const filaments: SeedFilament[] = [
  {
    brand: "Plexiwire",
    material: "PLA",
    color: "Чорний",
    diameterMm: 1.75,
    weightG: 1000,
    offers: [
      { shop: "plexiwire", price: 449 },
      { shop: "3dplastic", price: 479 },
      { shop: "ukr3d", price: 465, oldPrice: 520 },
      { shop: "artline", price: 499 },
    ],
  },
  {
    brand: "eSUN",
    material: "PLA",
    color: "Білий",
    diameterMm: 1.75,
    weightG: 1000,
    offers: [
      { shop: "filament-shop", price: 520 },
      { shop: "3dplastic", price: 549 },
      { shop: "artline", price: 510, oldPrice: 590 },
    ],
  },
  {
    brand: "Bestfilament",
    material: "PLA",
    color: "Червоний",
    diameterMm: 1.75,
    weightG: 1000,
    offers: [
      { shop: "ukr3d", price: 439 },
      { shop: "plexiwire", price: 455 },
    ],
  },
  {
    brand: "Plexiwire",
    material: "PETG",
    color: "Прозорий",
    diameterMm: 1.75,
    weightG: 1000,
    offers: [
      { shop: "plexiwire", price: 599 },
      { shop: "3dplastic", price: 629 },
      { shop: "filament-shop", price: 615, oldPrice: 680 },
    ],
  },
  {
    brand: "eSUN",
    material: "PETG",
    color: "Чорний",
    diameterMm: 1.75,
    weightG: 1000,
    offers: [
      { shop: "artline", price: 640 },
      { shop: "ukr3d", price: 605 },
      { shop: "3dplastic", price: 655, oldPrice: 699, inStock: false },
    ],
  },
  {
    brand: "Print Master",
    material: "ABS",
    color: "Сірий",
    diameterMm: 1.75,
    weightG: 1000,
    offers: [
      { shop: "3dplastic", price: 469 },
      { shop: "plexiwire", price: 489 },
    ],
  },
  {
    brand: "SUNLU",
    material: "TPU",
    color: "Чорний",
    diameterMm: 1.75,
    weightG: 1000,
    offers: [
      { shop: "filament-shop", price: 799, oldPrice: 899 },
      { shop: "ukr3d", price: 820 },
    ],
  },
  {
    brand: "Bestfilament",
    material: "ASA",
    color: "Білий",
    diameterMm: 1.75,
    weightG: 1000,
    offers: [
      { shop: "artline", price: 749 },
      { shop: "plexiwire", price: 719, oldPrice: 799 },
    ],
  },
  {
    brand: "Devil Design",
    material: "PLA",
    color: "Синій",
    diameterMm: 1.75,
    weightG: 1000,
    offers: [
      { shop: "filament-shop", price: 559 },
      { shop: "ukr3d", price: 575 },
    ],
  },
  {
    brand: "eSUN",
    material: "NYLON",
    color: "Натуральний",
    diameterMm: 1.75,
    weightG: 1000,
    offers: [{ shop: "3dplastic", price: 1290, oldPrice: 1450 }],
  },
];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log("Seeding shops...");
  const shopIdBySlug = new Map<string, string>();
  for (const s of shops) {
    const shop = await prisma.shop.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        slug: s.slug,
        name: s.name,
        url: s.url,
        scraperKey: s.scraperKey,
        deliveryKyiv: true,
        deliveryUa: true,
        lastScrapedAt: new Date(),
      },
    });
    shopIdBySlug.set(s.slug, shop.id);
  }

  console.log("Seeding filaments + listings + price history...");
  let count = 0;
  for (const f of filaments) {
    const filament = await prisma.filament.create({
      data: {
        brand: f.brand,
        material: f.material,
        color: f.color,
        diameterMm: f.diameterMm,
        weightG: f.weightG,
      },
    });

    for (const offer of f.offers) {
      const shopId = shopIdBySlug.get(offer.shop)!;
      const productUrl = `${shops.find((s) => s.slug === offer.shop)!.url}/product/demo-${filament.id}`;
      const discountPct =
        offer.oldPrice && offer.oldPrice > offer.price
          ? Math.round(((offer.oldPrice - offer.price) / offer.oldPrice) * 100)
          : null;

      const listing = await prisma.listing.create({
        data: {
          shopId,
          filamentId: filament.id,
          productUrl,
          currentPrice: offer.price,
          oldPrice: offer.oldPrice ?? null,
          inStock: offer.inStock ?? true,
          discountPct,
        },
      });

      // 14 дней истории с лёгким трендом к текущей цене
      const startPrice = offer.oldPrice ?? offer.price * (1 + Math.random() * 0.08);
      for (let i = 14; i >= 0; i--) {
        const t = 1 - i / 14;
        const noise = (Math.random() - 0.5) * 8;
        const price = Math.round(startPrice + (offer.price - startPrice) * t + noise);
        await prisma.priceHistory.create({
          data: {
            listingId: listing.id,
            price: Math.max(price, Math.round(offer.price * 0.9)),
            inStock: true,
            scrapedAt: daysAgo(i),
          },
        });
      }
      count++;
    }
  }

  console.log(`Done. Filaments: ${filaments.length}, listings: ${count}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
