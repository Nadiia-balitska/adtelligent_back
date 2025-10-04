import type { FastifyInstance } from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import {
  registerSchema,
  loginSchema,
} from "../modules/auth/schemas/auth.schema";
import { createAuthService } from "../modules/auth/services/auth.service";
export const autoPrefix = "/auth";
const authRoutes = async (fastify: FastifyInstance) => {
  const route = fastify.withTypeProvider<JsonSchemaToTsProvider>();
  const service = createAuthService(fastify);

  route.post("/register", { schema: registerSchema }, async (req, reply) => {
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

  route.post("/login", { schema: loginSchema }, async (req, reply) => {
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

  route.post("/logout", async (_req, reply) => {
    reply.clearCookie("token", {
      path: "/",
      secure: true,
      sameSite: "none",
    });
    return reply.code(204).send();
  });

  route.get("/me", { preValidation: [fastify.authenticate] }, async (req) => {
    const payload = await req.jwtVerify();
    const { sub, email, name } = payload as { sub: string; email: string; name?: string | null };
    return { id: sub, email, name: name ?? null };
  });
};

export default authRoutes;
