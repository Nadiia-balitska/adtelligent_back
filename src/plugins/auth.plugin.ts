import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import type { FastifyPluginAsync } from "fastify";

const authPlugin: FastifyPluginAsync = async (fastify) => {

await fastify.register(cookie);

  await fastify.register(jwt, {
    secret: fastify.config.JWT_SECRET,
    cookie: { cookieName: "token", signed: false },
  });



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

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: { sub: string; email: string; name?: string | null };
  }
}