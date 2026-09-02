import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

let instance: PrismaClient | null = null;

function buildClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_, prop: string | symbol) {
    if (!instance) {
      instance = globalThis.prismaGlobal ?? buildClient();
      if (!globalThis.prismaGlobal) {
        globalThis.prismaGlobal = instance;
      }
    }
    return instance[prop as keyof PrismaClient];
  },
  set(_target, _prop: string | symbol, _value) {
    return true;
  },
});
