"use client";

import { useMemo, useState } from "react";
import type { BoardFilament } from "@/lib/queries";
import { colorToHex } from "@/lib/colors";
import PriceHistoryChart from "./PriceHistoryChart";
import SubscribeModal from "./SubscribeModal";
import MultiSelect from "./MultiSelect";
import Collapsible from "./Collapsible";

type SortKey = "price-asc" | "price-desc" | "brand";

const currency = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 });

/** Фото котушки з магазину, якщо є — з фолбеком на кольоровий кружок при
 * відсутньому фото або помилці завантаження (хотлінк-захист тощо). */
function Swatch({ imageUrl, color }: { imageUrl: string | null; color: string }) {
  const [failed, setFailed] = useState(false);

  if (imageUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        aria-hidden
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-10 w-10 shrink-0 rounded-full border border-line/60 bg-surface-2 object-cover"
      />
    );
  }

  return (
    <span
      className="spool-swatch h-10 w-10 shrink-0 rounded-full"
      style={{ background: colorToHex(color) }}
      aria-hidden
    />
  );
}

export default function PriceExplorer({ board }: { board: BoardFilament[] }) {
  const materialOptions = useMemo(
    () => Array.from(new Set(board.map((f) => f.material))).sort(),
    [board]
  );
  const brandOptions = useMemo(
    () => Array.from(new Set(board.map((f) => f.brand))).sort(),
    [board]
  );
  const shopOptions = useMemo(
    () =>
      Array.from(new Map(board.flatMap((f) => f.offers).map((o) => [o.shopSlug, o.shopName])).entries()),
    [board]
  );
  const shopOptionLabels = useMemo(() => Object.fromEntries(shopOptions), [shopOptions]);
  const maxPriceAll = useMemo(
    () => Math.max(1000, ...board.map((f) => f.bestPrice)),
    [board]
  );

  const [query, setQuery] = useState("");
  const [materials, setMaterials] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [shops, setShops] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(0); // 0 = без обмеження
  const [onlySale, setOnlySale] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [sort, setSort] = useState<SortKey>("price-asc");
  const [expanded, setExpanded] = useState<string | null>(null);
  // Панель історії лишається в DOM ще й на час анімації згортання — інакше
  // вона зникала б миттєво, без зворотного переходу. `mounted` тримає id
  // рядка, чия панель зараз відрендерена (максимум один: тримати графік
  // Recharts для всіх ~1800 позицій одразу було б задорого).
  const [mounted, setMounted] = useState<string | null>(null);
  // Графік Recharts перемальовується на кожну зміну розміру контейнера, тож
  // під час анімації він з'їдав би кадри. Показуємо його аж коли панель
  // розкрилася — до того місце під нього просто зарезервоване.
  const [settled, setSettled] = useState(false);

  function toggleRow(id: string) {
    if (expanded === id) {
      setExpanded(null); // Collapsible зніме панель, коли схлопне її
      setSettled(false); // прибрати графік ще до згортання, щоб не перемальовувати його щокадру
      return;
    }
    setMounted(id);
    setExpanded(id);
    setSettled(false);
  }

  const filtered = useMemo(() => {
    let rows = board.filter((f) => {
      if (materials.length > 0 && !materials.includes(f.material)) return false;
      if (brands.length > 0 && !brands.includes(f.brand)) return false;
      if (shops.length > 0 && !f.offers.some((o) => shops.includes(o.shopSlug))) return false;
      if (onlySale && !f.onSale) return false;
      if (onlyInStock && !f.offers.some((o) => o.inStock)) return false;
      if (maxPrice > 0 && f.bestPrice > maxPrice) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const haystack = `${f.brand} ${f.material} ${f.color}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      if (sort === "brand") return a.brand.localeCompare(b.brand);
      if (sort === "price-desc") return b.bestPrice - a.bestPrice;
      return a.bestPrice - b.bestPrice;
    });

    return rows;
  }, [board, materials, brands, shops, onlySale, onlyInStock, maxPrice, query, sort]);

  return (
    <div className="flex flex-col gap-6">
      {/* Панель фільтрів */}
      <div className="rise-in relative z-10 rounded-[var(--radius)] border border-line bg-surface p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="flex flex-col gap-1 lg:col-span-2">
            <span className="text-[11px] uppercase tracking-wider text-muted">Пошук</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="бренд, колір, PLA..."
              className="rounded-md border border-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-accent"
            />
          </label>

          <MultiSelect label="Матеріал" options={materialOptions} selected={materials} onChange={setMaterials} />
          <MultiSelect label="Бренд" options={brandOptions} selected={brands} onChange={setBrands} />
          <MultiSelect
            label="Магазин"
            options={shopOptions.map(([slug]) => slug)}
            optionLabels={shopOptionLabels}
            selected={shops}
            onChange={setShops}
          />

          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wider text-muted">
              Макс. ціна {maxPrice > 0 ? `— ${currency.format(maxPrice)} ₴` : ""}
            </span>
            <input
              type="range"
              min={0}
              max={maxPriceAll}
              step={50}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="mt-2"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-4">
          <Toggle checked={onlyInStock} onChange={setOnlyInStock} label="Тільки в наявності" />
          <Toggle checked={onlySale} onChange={setOnlySale} label="Тільки акції 🔥" />

          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="uppercase tracking-wider text-muted">Сортування</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-md border border-line bg-ink px-2 py-1.5 font-mono text-xs text-paper outline-none focus:border-accent"
            >
              <option value="price-asc">Дешевші спочатку</option>
              <option value="price-desc">Дорожчі спочатку</option>
              <option value="brand">За брендом</option>
            </select>
          </div>
        </div>
      </div>

      <p className="text-xs uppercase tracking-widest text-muted">
        Знайдено позицій: <span className="font-mono text-paper">{filtered.length}</span>
      </p>

      {/* Таблиця */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <div className="rounded-[var(--radius)] border border-dashed border-line p-10 text-center text-muted">
            Нічого не знайдено. Спробуй послабити фільтри.
          </div>
        )}

        {filtered.map((f, i) => {
          const isOpen = expanded === f.id;
          const isMounted = mounted === f.id;
          const best = f.offers.find((o) => o.inStock) ?? f.offers[0];

          return (
            <div
              key={f.id}
              className="row-card rise-in overflow-hidden rounded-[var(--radius)] border border-line bg-surface"
              style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
            >
              <button
                type="button"
                onClick={() => toggleRow(f.id)}
                className="flex w-full flex-wrap items-center gap-4 p-4 text-left transition hover:bg-surface-2 sm:flex-nowrap"
              >
                <Swatch imageUrl={f.imageUrl} color={f.color} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-display text-lg uppercase leading-none text-paper">
                      {f.brand}
                    </span>
                    <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-[11px] text-accent-2">
                      {f.material}
                    </span>
                    {f.onSale && (
                      <span className="rounded bg-danger/15 px-1.5 py-0.5 font-mono text-[11px] text-danger">
                        АКЦІЯ
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-sm text-paper-dim">
                    {f.color} · Ø{f.diameterMm} мм · {f.weightG} г ·{" "}
                    <span className="text-muted">{f.offers.length} {plural(f.offers.length)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:ml-auto">
                  <div className="text-right">
                    <div className="font-mono text-xl font-semibold text-lime">
                      {currency.format(f.bestPrice)} ₴
                    </div>
                    <div className="text-[11px] uppercase tracking-wide text-muted">
                      {best?.shopName ?? "—"}
                    </div>
                  </div>
                  <span
                    className={`font-display text-2xl text-muted transition-transform ${isOpen ? "rotate-45" : ""}`}
                  >
                    +
                  </span>
                </div>
              </button>

              {isMounted && (
                <Collapsible
                  open={isOpen}
                  onOpened={() => setSettled(true)}
                  onClosed={() => setMounted(null)}
                >
                  <div>
                    <div className="border-t border-line bg-ink/40 p-4 sm:p-5">
                      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                        <div className="flex flex-col gap-2">
                          {f.offers.map((o) => (
                            <div
                              key={o.id}
                              className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2"
                            >
                              <div className="w-28 shrink-0 truncate font-display text-sm uppercase text-paper-dim">
                                {o.shopName}
                              </div>
                              <div className="font-mono text-sm font-semibold text-paper">
                                {currency.format(o.price)} ₴
                              </div>
                              {o.oldPrice && o.discountPct ? (
                                <span className="font-mono text-xs text-muted line-through">
                                  {currency.format(o.oldPrice)} ₴
                                </span>
                              ) : null}
                              {o.discountPct ? (
                                <span className="rounded bg-danger/15 px-1.5 py-0.5 font-mono text-[11px] text-danger">
                                  -{o.discountPct}%
                                </span>
                              ) : null}
                              {!o.inStock && (
                                <span className="rounded bg-line px-1.5 py-0.5 font-mono text-[11px] text-muted">
                                  немає в наявності
                                </span>
                              )}
                              <a
                                href={o.productUrl}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="ml-auto shrink-0 rounded-md border border-line px-3 py-1 text-xs uppercase tracking-wide text-teal transition hover:border-teal"
                              >
                                До магазину →
                              </a>
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3">
                          <div className="text-[11px] uppercase tracking-wider text-muted">
                            Історія ціни (найдешевша пропозиція)
                          </div>
                          {settled ? (
                        <PriceHistoryChart history={best?.history ?? []} />
                      ) : (
                        <div className="h-28" />
                      )}
                          <SubscribeModal
                            filamentId={f.id}
                            label={`${f.brand} ${f.material} · ${f.color}`}
                            trigger={
                              <span className="mt-1 inline-flex w-full items-center justify-center rounded-md bg-accent px-3 py-2 font-display text-sm uppercase tracking-wide text-ink transition hover:brightness-110">
                                🔔 Стежити за ціною
                              </span>
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Collapsible>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function plural(n: number) {
  if (n === 1) return "магазин";
  if (n >= 2 && n <= 4) return "магазини";
  return "магазинів";
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-paper-dim">
      <span
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-accent" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-paper transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`}
        />
      </span>
      {label}
    </label>
  );
}
