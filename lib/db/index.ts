import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
let prismaInstance: PrismaClient;

export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    if (!prismaInstance) {
      if (globalForPrisma.prisma) {
        prismaInstance = globalForPrisma.prisma;
      } else {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
          // Fallback during static build phase when env is not loaded in the build worker
          prismaInstance = new PrismaClient({
            log: ["error"],
          });
        } else {
          const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
          const pool = new Pool({
            connectionString,
            // AWS RDS requires SSL; local Supabase does not
            ssl: isLocal ? false : { rejectUnauthorized: false },
          });
          const adapter = new PrismaPg(pool);
          prismaInstance = new PrismaClient({
            adapter,
            log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
          });
          if (process.env.NODE_ENV !== "production") {
            globalForPrisma.prisma = prismaInstance;
          }
        }
      }
    }
    return Reflect.get(prismaInstance, prop, receiver);
  },
});
