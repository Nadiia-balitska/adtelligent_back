import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";

const healthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async (req, reply) => {
    const status = {
      prisma: "unknown" as "ok" | "down" | "unknown",
    };

    try {
      if (fastify.prisma) {
        await fastify.prisma.$executeRaw`SELECT 1`;
        status.prisma = "ok";
      }
    } catch (err) {
      status.prisma = "down";
      fastify.log.error({ err }, "Prisma health failed");
    }

 
    const overallOk = status.prisma === "ok" ;
    if (!overallOk) reply.code(500);
    return { status: overallOk ? "ok" : "down", ...status };
  });

  fastify.get("/db", async (req, reply) => {
    try {
      if (fastify.prisma) await fastify.prisma.$executeRaw`SELECT 1`;
      return { status: "ok" };
    } catch (err) {
      fastify.log.error({ err }, "DB health failed");
      reply.code(500);
      return { status: "down" };
    }
  });
};

export default fp(healthPlugin, { name: "health-plugin" });
