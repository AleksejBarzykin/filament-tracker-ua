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
  bestPrice: number;
  onSale: boolean;
  offers: BoardOffer[];
};

export async function getBoard(): Promise<BoardFilament[]> {
  const filaments = await prisma.filament.findMany({
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
    .filter((f) => f.listings.length > 0)
    .map((f) => {
      const offers: BoardOffer[] = f.listings
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
        bestPrice,
        onSale: offers.some((o) => (o.discountPct ?? 0) > 0),
        offers,
      };
    })
    .sort((a, b) => a.bestPrice - b.bestPrice);

  return board;
}
