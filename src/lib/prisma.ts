import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// `error` + `warn` go to the platform logger; `query` is only useful
// when actively debugging slow paths — enable via `PRISMA_LOG_QUERIES=1`.
const log: ("query" | "error" | "warn")[] =
  process.env.PRISMA_LOG_QUERIES === "1"
    ? ["query", "warn", "error"]
    : ["warn", "error"];

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log,
    errorFormat: process.env.NODE_ENV === "production" ? "minimal" : "pretty",
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
