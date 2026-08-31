import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma's SQLite connector resolves a relative `file:` URL against an
// absolute path baked in at `prisma generate` time on the build machine. On
// Vercel that path doesn't exist at runtime (different filesystem root per
// invocation), so we recompute it from the actual runtime cwd instead of
// trusting DATABASE_URL's relative path resolution.
const candidates = [
  path.join(process.cwd(), "prisma", "dev.db"),
  path.join(process.cwd(), "..", "prisma", "dev.db"),
  path.join(__dirname, "prisma", "dev.db"),
];

const dbPath = candidates.find((p) => fs.existsSync(p)) ?? candidates[0];

if (process.env.NODE_ENV === "production") {
  console.log("[prisma] cwd:", process.cwd());
  console.log("[prisma] __dirname:", __dirname);
  for (const p of candidates) {
    console.log("[prisma] candidate", p, "exists:", fs.existsSync(p));
  }
  console.log("[prisma] using dbPath:", dbPath);
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
