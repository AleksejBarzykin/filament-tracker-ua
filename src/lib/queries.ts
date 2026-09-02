import { prisma } from "./prisma";

export type BoardOffer = {
  id: string;
  shopSlug: string;
  shopName: string;
  shopUrl: string;
  productUrl: string;
  price: number;
  oldPrice: number | null;
  discountPct: number | null;
  inStock: boolean;
  history: { price: number; scrapedAt: string }[];
};

export type BoardFilament = {
  id: string;
  brand: string;
  material: string;
  color: string;
  diameterMm: number;
  weightG: number;
  imageUrl: string | null;
  bestPrice: number;
  onSale: boolean;
  offers: BoardOffer[];
};

/**
 * Товари, які магазин кладе в ту саму категорію, що й філамент, і в назві яких
 * згадується сумісний матеріал ("клей для PLA/PETG", "спрей для 3D-друку") —
 * через ту згадку вони проходять перевірку матеріалу, але філаментом не є.
 * Сюди ж — прутки для 3D-ручок (не котушка для принтера) і порожні шпулі.
 */
const NOT_FILAMENT =
  /кле[йюя]|glue|спрей|spray|адгез|3d[-\s]?ручк|ручк[иа]\b|шпул|сопл|nozzle|термопаст|фільтр|очищ|аркуш/i;

/**
 * Мінімальна правдоподібна ціна котушки філаменту. Поодинокі картки
 * (напр. ArtLine з ціною 1 ₴) — це не пропозиція, а заглушка на сторінці
 * товару, якого зараз немає в продажу; у сортуванні "дешевші спочатку"
 * така картка стає першою й обіцяє ціну, якої не існує.
 */
const MIN_PLAUSIBLE_PRICE = 50;

export async function getBoard(): Promise<BoardFilament[]> {
  const filaments = await prisma.filament.findMany({
    // Категорії деяких магазинів (особливо Rozetka/OLX) — це "витратні
    // матеріали для 3D-друку" загалом, а не тільки філамент: туди
    // потрапляють сопла, клей, термопаста, фільтри, котушки для
    // перемотування тощо. У таких товарів назва не містить жодного
    // матеріалу (PLA/PETG/ABS/...), і скрапер позначає їх "OTHER" —
    // відсікаємо це сміття тут, а не на клієнті, щоб воно не впливало на
    // статистику й лічильники. RESIN — фотополімерна смола для SLA/DLP
    // (рідина без діаметра нитки, не філамент) теж не те, що шукає
    // користувач. diameterMm !== 1.75 лишає тільки стандартний форм-фактор
    // (відсікає філамент під 2.85/3мм принтери й помилково розпізнані
    // "діаметри" на кшталт товщини аркуша пластику).
    where: {
      NOT: { material: { in: ["OTHER", "RESIN"] } },
      diameterMm: 1.75,
    },
    include: {
      listings: {
        include: {
          shop: true,
          priceHistory: {
            orderBy: { scrapedAt: "asc" },
            take: 30,
          },
        },
      },
    },
  });

  const board: BoardFilament[] = filaments
    .filter((f) => f.listings.length > 0 && !NOT_FILAMENT.test(f.color))
    .map((f) => {
      const offers: BoardOffer[] = f.listings
        .filter((l) => l.currentPrice >= MIN_PLAUSIBLE_PRICE)
        .map((l) => ({
          id: l.id,
          shopSlug: l.shop.slug,
          shopName: l.shop.name,
          shopUrl: l.shop.url,
          productUrl: l.productUrl,
          price: l.currentPrice,
          oldPrice: l.oldPrice,
          discountPct: l.discountPct,
          inStock: l.inStock,
          history: l.priceHistory.map((h) => ({
            price: h.price,
            scrapedAt: h.scrapedAt.toISOString(),
          })),
        }))
        .sort((a, b) => a.price - b.price);

      const inStockOffers = offers.filter((o) => o.inStock);
      const bestPrice = (inStockOffers[0] ?? offers[0])?.price ?? 0;

      return {
        id: f.id,
        brand: f.brand,
        material: f.material,
        color: f.color,
        diameterMm: f.diameterMm,
        weightG: f.weightG,
        imageUrl: f.imageUrl,
        bestPrice,
        onSale: offers.some((o) => (o.discountPct ?? 0) > 0),
        offers,
      };
    })
    // Позиція, у якої після відсіву неправдоподібних цін не лишилось жодної
    // пропозиції, показувати нема з чим.
    .filter((f) => f.offers.length > 0)
    .sort((a, b) => a.bestPrice - b.bestPrice);

  return board;
}
