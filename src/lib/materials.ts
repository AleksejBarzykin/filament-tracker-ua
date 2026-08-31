export const MATERIALS = [
  "PLA",
  "PETG",
  "ABS",
  "ASA",
  "TPU",
  "NYLON",
  "PC",
  "RESIN",
  "OTHER",
] as const;

export type Material = (typeof MATERIALS)[number];

export function normalizeMaterial(raw: string): Material {
  // Прибираємо лише дефіси/крапки (не пробіли — інакше слова "зливаються"
  // і межі \b стають марними), щоб "PET-G" теж збігався з "PETG" — деякі
  // магазини (3DPlastic, Spectrum) пишуть саме через дефіс.
  const upper = raw.trim().toUpperCase().replace(/[-.]/g, "");
  if (/\bPA\d*GF\b|\bPA6\b|\bPA12\b|POLYAMIDE/.test(upper)) return "NYLON";
  const match = MATERIALS.find((m) => upper.includes(m));
  return match ?? "OTHER";
}
