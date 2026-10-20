/**
 * Прибирає з БД залишки демо-даних (`npm run db:seed`).
 *
 * Демо-сид наповнював базу правдоподібними, але вигаданими цінами, поки
 * реального скрапінгу ще не було. Тепер магазини скрапляться по-справжньому
 * (>2000 позицій), а демо-рядки лишалися видимими нагорі списку: ціни в них
 * вигадані, а посилання "До магазину" вели на загальну сторінку категорії
 * замість конкретного товару — тобто вводили користувача в оману.
 *
 * Демо-лістинги впізнаються за productUrl:
 *  - URL категорії + якір `#<cuid філамента>` (див. resolveProductUrl у
 *    scripts/seed-demo.ts) — саме так сид унікалізував спільні посилання;
 *  - жменя URL, зашитих у сид явно (offer.url) — сторінки реальні, але ціни
 *    поряд з ними так само вигадані.
 *
 * Запуск: DATABASE_URL="file:./dev.db" npx tsx scripts/purge-demo-seed.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Явні offer.url із scripts/seed-demo.ts. */
const SEED_EXPLICIT_URLS = [
  "https://brain.com.ua/ukr/Plastik_dlya_3D-printera_Creality_PLA_1kg_175mm_orange_3301010307-p1119797.html",
  "https://rozetka.com.ua/ua/rashodnie-materiali-dlya-3d-printerov/c4671751/producer=bambu-lab/",
  "https://www.olx.ua/d/uk/obyavlenie/pla-plastik-flament-dlya-3d-printera-kingroon-pla-chorniy-IDUhP4b.html",
  "https://www.olx.ua/d/uk/obyavlenie/plastik-flament-3d-printera-sunlu-petg-1-75-mm-1-kg-belyy-filament-IDThoqH.html",
];

/** Якір із cuid філамента, який додавав resolveProductUrl демо-сида. */
const SEED_ANCHOR = /#c[a-z0-9]{20,}$/;

async function main() {
  const listings = await prisma.listing.findMany({ select: { id: true, productUrl: true } });
  const demoIds = listings
    .filter((l) => SEED_ANCHOR.test(l.productUrl) || SEED_EXPLICIT_URLS.includes(l.productUrl))
    .map((l) => l.id);

  console.log(`Демо-лістингів знайдено: ${demoIds.length} з ${listings.length}`);
  if (demoIds.length === 0) return;

  const history = await prisma.priceHistory.deleteMany({ where: { listingId: { in: demoIds } } });
  const removed = await prisma.listing.deleteMany({ where: { id: { in: demoIds } } });
  console.log(`Видалено лістингів: ${removed.count}, записів історії цін: ${history.count}`);

  // Філаменти, у яких після цього не лишилось жодної пропозиції, — теж демо.
  const orphans = await prisma.filament.findMany({
    where: { listings: { none: {} } },
    select: { id: true, brand: true, material: true, color: true },
  });
  for (const f of orphans) console.log(`  осиротілий філамент: ${f.brand} ${f.material} · ${f.color}`);
  await prisma.subscription.deleteMany({ where: { filamentId: { in: orphans.map((f) => f.id) } } });
  const removedFilaments = await prisma.filament.deleteMany({ where: { id: { in: orphans.map((f) => f.id) } } });
  console.log(`Видалено філаментів без пропозицій: ${removedFilaments.count}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
