import { PrismaClient } from "@prisma/client";
import path from "node:path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma's SQLite connector resolves a relative `file:` URL against an
// absolute path baked in at `prisma generate` time on the build machine. On
// Vercel that path doesn't exist at runtime (different filesystem root per
// invocation), so we recompute it from the actual runtime cwd instead of
// trusting DATABASE_URL's relative path resolution.
const dbPath = path.join(process.cwd(), "prisma", "dev.db");

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
