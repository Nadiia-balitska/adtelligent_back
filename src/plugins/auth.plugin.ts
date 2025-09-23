import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyPluginAsync } from "fastify";

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.register(jwt, { secret: fastify.config.JWT_SECRET });

  fastify.decorate("authenticate", async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch (err) {
      reply.code(401).send({ message: "Unauthorized" });
    }
  });
};

export default fp(authPlugin, { name: "auth-plugin" });

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: any, reply: any) => Promise<void>;
  }
  interface FastifyRequest {
    jwt: { user?: { id: string; email: string } };
  }
}
