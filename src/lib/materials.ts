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
  const upper = raw.trim().toUpperCase();
  const match = MATERIALS.find((m) => upper.includes(m));
  return match ?? "OTHER";
}
