const USER_AGENT =
  "Mozilla/5.0 (compatible; FilamentTrackerUA/1.0; +https://github.com/) price monitor bot";

export async function fetchHtml(url: string, retries = 2): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "uk-UA,uk;q=0.9,ru;q=0.8,en;q=0.7",
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        console.warn(`[fetchHtml] ${url} -> HTTP ${res.status}`);
        if (res.status >= 500 && attempt < retries) continue;
        return null;
      }
      return await res.text();
    } catch (err) {
      console.warn(`[fetchHtml] ${url} failed (attempt ${attempt + 1}):`, (err as Error).message);
      if (attempt === retries) return null;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return null;
}

/** "1 250,00 грн" | "1250 грн" | "₴1250" -> 1250 */
export function parsePrice(raw: string | null | undefined): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw
    .replace(/ /g, " ")
    .replace(/[^\d,.\s]/g, "")
    .trim();
  if (!cleaned) return undefined;
  const normalized = cleaned.replace(/\s/g, "").replace(",", ".");
  const value = parseFloat(normalized);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

/** Пытается вытащить диаметр (1.75/2.85/3.0 мм) из названия товара. */
export function extractDiameter(text: string): number {
  const match = text.match(/(1[.,]75|2[.,]85|3[.,]0|3\s?мм|1\.75|2\.85)/i);
  if (!match) return 1.75;
  const num = match[0].replace(",", ".").replace(/[^\d.]/g, "");
  const val = parseFloat(num);
  return Number.isFinite(val) && val > 0 ? val : 1.75;
}

/** Пытается вытащить вес катушки (750г, 1кг, 1000 г) из названия товара. */
export function extractWeight(text: string): number {
  const kg = text.match(/(\d+(?:[.,]\d+)?)\s?кг/i);
  if (kg) return Math.round(parseFloat(kg[1].replace(",", ".")) * 1000);
  const g = text.match(/(\d{3,4})\s?г(?!р[иа])/i);
  if (g) return parseInt(g[1], 10);
  return 1000;
}

const KNOWN_BRANDS = [
  "eSUN",
  "eSun",
  "Plexiwire",
  "Filament PM",
  "Bestfilament",
  "GEMBIRD",
  "Print Master",
  "PrintMaster",
  "3DPlastic",
  "REC",
  "Filamentarno",
  "Extrudr",
  "SUNLU",
  "Creality",
  "Devil Design",
  "Kingroon",
  "Polymaker",
  "ColorFabb",
  "Bambu Lab",
  "BambuLab",
  "Elegoo",
  "333print",
  "Inslogic",
  "CREAT3D",
  "Spectrum",
];

export function guessBrand(text: string, fallback: string): string {
  const found = KNOWN_BRANDS.find((b) => text.toLowerCase().includes(b.toLowerCase()));
  return found ?? fallback;
}

/** Приблизительное название цвета — первое слово после материала/бренда, либо весь остаток строки. */
export function guessColor(text: string): string {
  const cleaned = text
    .replace(/пластик|філамент|филамент|для 3d[- ]?принтера|котушка|котушку|бобина/gi, "")
    .replace(/(PLA|PETG|ABS|ASA|TPU|NYLON|PC)/gi, "")
    .replace(/\d+(?:[.,]\d+)?\s?(мм|кг|г)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || "не вказано";
}
