import { PrismaClient } from "@prisma/client";

// Single shared PrismaClient per server process.
//
// Next.js dev server hot-reloads modules on every change; without this guard
// each reload would create a new PrismaClient and exhaust the database
// connection pool. In production the module is evaluated once, so the guard
// is inert there.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
