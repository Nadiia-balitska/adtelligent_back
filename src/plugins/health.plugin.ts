import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

const healthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async (req, reply) => {
    const status = {
      prisma: "unknown" as "ok" | "down" | "unknown",
    };

    try {
      if (fastify.prisma) {
     const res = await fastify.prisma.$runCommandRaw({ ping: 1 }) as { ok?: number };
if (res?.ok !== 1) throw new Error("Mongo ping failed");
      }
    } catch (err) {
      status.prisma = "down";
      fastify.log.error({ err }, "Prisma health failed");
    }

 
    const overallOk = status.prisma === "ok" ;
    if (!overallOk) reply.code(500);
    return { status: overallOk ? "ok" : "down", ...status };
  });

  fastify.get("/health/db", async (req, reply) => {
    try {
    const res = await fastify.prisma.$runCommandRaw({ ping: 1 }) as { ok?: number };
if (res?.ok !== 1) throw new Error("Mongo ping failed");
    } catch (err) {
      fastify.log.error({ err }, "DB health failed");
      reply.code(500);
      return { status: "down" };
    }
  });
};

export default fp(healthPlugin, { name: "health-plugin" });
