import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";

export default fp(async (fastify: FastifyInstance) => {
  const prisma = new PrismaClient();

const realTx = prisma.$transaction.bind(prisma);
prisma.$transaction = (arg: any, ...rest: any[]) => {
  if (Array.isArray(arg)) {
    return (async () => {
      const results = [];
      for (const p of arg) results.push(await p);
      return results;
    })();
  }
  if (typeof arg === "function") {
    return (arg as Function)(prisma);
  }
  return realTx(arg, ...rest);
};


  await prisma.$connect();

  fastify.decorate("prisma", prisma);

  fastify.addHook("onClose", async (app) => {
    await app.prisma.$disconnect();
  });

  fastify.log.info("Prisma connected");
});

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}