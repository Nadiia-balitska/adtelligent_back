import type { FastifyInstance } from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import {
  registerSchema,
  loginSchema,
} from "../schemas/auth.schema";
import { createAuthService } from "../services/auth.service";

const authRoutes = async (fastify: FastifyInstance) => {
  const route = fastify.withTypeProvider<JsonSchemaToTsProvider>();
  const service = createAuthService(fastify);

  route.post("/api/auth/register", { schema: registerSchema }, async (req, reply) => {
    try {
      const { token } = await service.register(req.body);
      reply.setCookie("token", token, {
        httpOnly: true,
        secure: true,            
        sameSite: "none",         
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return { token };
    } catch (err) {
      return reply.code(500).send({
        message: "Register failed",
        token: ""
      });
    }
  });

  route.post("/api/auth/login", { schema: loginSchema }, async (req, reply) => {
    try {
      const { token } = await service.login(req.body);
      reply.setCookie("token", token, {
        httpOnly: true,
        secure: true,             
        sameSite: "none",        
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
      return { token };
    } catch (err) {
      return reply.code(401).send({
        message: "Invalid credentials",
        token: ""
      });
    }
  });

  route.post("/api/auth/logout", async (_req, reply) => {
    reply.clearCookie("token", {
      path: "/",
      secure: true,
      sameSite: "none",
    });
    return reply.code(204).send();
  });

  route.get("/api/auth/me", { preValidation: [fastify.authenticate] }, async (req) => {
    const payload = await req.jwtVerify();
    const { sub, email, name } = payload as { sub: string; email: string; name?: string | null };
    return { id: sub, email, name: name ?? null };
  });
};

export default authRoutes;
