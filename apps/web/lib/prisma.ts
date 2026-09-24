import { PrismaClient } from "@prisma/client";

// Single shared PrismaClient per server process, created LAZILY on first use.
//
// Two reasons for lazy creation:
// 1. Next.js dev hot-reloads modules on every change; without the globalThis
//    guard each reload would create a new PrismaClient and exhaust the
//    database connection pool. In production the module is evaluated once,
//    so the guard is inert there.
// 2. Importing this module must not connect/instantiate: Next's build reads
//    page modules ("collecting page data") without executing requests, and
//    pages that merely *can* touch the database must stay import-safe.
export function getPrisma(): PrismaClient {
  const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}
