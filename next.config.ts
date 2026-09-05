import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js bundles serverless functions by statically tracing file
  // dependencies; it can't see that Prisma opens prisma/dev.db via a
  // runtime env var, so without this the SQLite file is missing on Vercel
  // and every DB query fails in production.
  outputFileTracingIncludes: {
    "/": ["./prisma/dev.db"],
  },
};

export default nextConfig;
