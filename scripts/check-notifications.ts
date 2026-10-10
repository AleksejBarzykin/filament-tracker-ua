/**
 * Проверяет активные подписки (Subscription) и печатает, кому пора отправить
 * уведомление о снижении цены/акции. Реальную отправку email нужно подключить
 * через провайдера (Resend, Postmark, SMTP и т.п.) — см. TODO ниже. Скрипт
 * задуман для регулярного запуска сразу после скрапинга (см.
 * .github/workflows/scrape.yml), чтобы подписки проверялись по свежим ценам.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const subs = await prisma.subscription.findMany({ where: { notifiedAt: null } });
  let toNotify = 0;

  for (const sub of subs) {
    const listings = await prisma.listing.findMany({
      where: sub.filamentId ? { filamentId: sub.filamentId } : {},
      include: { filament: true, shop: true },
    });

    const trigger = listings.find((l) => {
      const priceHit = sub.targetPrice != null && l.currentPrice <= sub.targetPrice;
      const saleHit = sub.notifyAnySale && (l.discountPct ?? 0) > 0;
      return priceHit || saleHit;
    });

    if (trigger) {
      toNotify++;
      console.log(
        `[notify] ${sub.email} -> ${trigger.filament.brand} ${trigger.filament.material} ${trigger.filament.color} ` +
          `у ${trigger.shop.name}: ${trigger.currentPrice} грн (${trigger.productUrl})`
      );

      // TODO: подключить реальную отправку письма, например через Resend:
      //   await resend.emails.send({ from: "...", to: sub.email, subject: "...", html: "..." });

      await prisma.subscription.update({
        where: { id: sub.id },
        data: { notifiedAt: new Date() },
      });
    }
  }

  console.log(`Checked ${subs.length} subscriptions, ${toNotify} triggered.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
