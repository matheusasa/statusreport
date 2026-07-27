import { PrismaClient } from "@prisma/client";

// Avoid exhausting the Postgres connection pool with a new PrismaClient on
// every hot-reload in development, by caching the instance on `globalThis`.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
