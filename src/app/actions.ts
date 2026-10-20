"use server";

import { prisma } from "@/lib/prisma";

export type SubscribeState = { ok: boolean; message: string };

export async function subscribe(
  _prev: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  const email = String(formData.get("email") ?? "").trim();
  const filamentId = String(formData.get("filamentId") ?? "") || null;
  const targetPriceRaw = String(formData.get("targetPrice") ?? "").trim();
  const notifyAnySale = formData.get("notifyAnySale") === "on";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Введіть коректний email." };
  }

  const targetPrice = targetPriceRaw ? parseFloat(targetPriceRaw) : null;

  await prisma.subscription.create({
    data: {
      email,
      filamentId,
      targetPrice: Number.isFinite(targetPrice) ? targetPrice : null,
      notifyAnySale,
    },
  });

  return {
    ok: true,
    message: "Готово! Повідомимо на email, коли ціна впаде або зʼявиться акція.",
  };
}
