import { getBoard } from "@/lib/queries";
import PriceExplorer from "@/components/PriceExplorer";
import SubscribeModal from "@/components/SubscribeModal";

export const dynamic = "force-dynamic";

export default async function Home() {
  const board = await getBoard();
  const shopCount = new Set(board.flatMap((f) => f.offers.map((o) => o.shopSlug))).size;
  const saleCount = board.filter((f) => f.onSale).length;
  const cheapest = board[0];

  return (
    <>
      <header className="relative overflow-hidden border-b border-line">
        <div className="hazard-edge h-1.5 w-full" />
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
          <div className="flex items-center gap-3">
            <svg
              viewBox="0 0 48 48"
              className="spin-slow h-9 w-9 shrink-0 text-accent"
              fill="none"
            >
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" />
              <circle cx="24" cy="24" r="7" stroke="currentColor" strokeWidth="3" />
              <path d="M24 4v13M24 31v13M44 24H31M17 24H4" stroke="currentColor" strokeWidth="3" />
            </svg>
            <span className="font-display text-sm uppercase tracking-[0.25em] text-muted">
              Моніторинг цін · Київ / Україна
            </span>
          </div>

          <h1 className="font-display text-5xl uppercase leading-[0.95] text-paper sm:text-7xl">
            КОТУШКА<span className="text-accent">.UA</span>
          </h1>
          <p className="max-w-xl text-base text-paper-dim sm:text-lg">
            Порівнюємо ціни на філамент для 3D-друку в українських магазинах —
            PLA, PETG, ABS та інше. Знаходь, де дешевше, лови акції та стеж за
            історією ціни улюбленої котушки.
          </p>

          <div className="flex flex-wrap gap-6 pt-2 font-mono text-sm">
            <Stat value={board.length} label="позицій філаменту" />
            <Stat value={shopCount} label="магазинів" />
            <Stat value={saleCount} label="зі знижкою" accent />
            {cheapest && (
              <Stat value={`${Math.round(cheapest.bestPrice)} ₴`} label="найдешевша котушка зараз" />
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <PriceExplorer board={board} />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Дані оновлюються автоматично зі скраперів магазинів. Ціни можуть
            відрізнятись від актуальних — перевіряй на сайті магазину перед
            покупкою.
          </p>
          <SubscribeModal
            label="Загальна підписка: повідомимо про будь-яку помітну знижку на філамент."
            trigger={
              <span className="inline-flex shrink-0 items-center gap-2 rounded-md border border-line px-4 py-2 font-display text-sm uppercase tracking-wide text-paper transition hover:border-accent hover:text-accent">
                🔔 Стежити за всіма акціями
              </span>
            }
          />
        </div>
      </footer>
    </>
  );
}

function Stat({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className={`text-2xl font-semibold ${accent ? "text-accent" : "text-teal"}`}>{value}</span>
      <span className="text-[11px] uppercase tracking-wider text-muted">{label}</span>
    </div>
  );
}
