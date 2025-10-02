import type { FastifyInstance } from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import {
  registerSchema,
  loginSchema,
  type AuthBody,          
  type AuthReply,
} from "../schemas/auth.schema";
import { createAuthService } from "../services/auth.service";

const authRoutes = async (fastify: FastifyInstance) => {
  const r = fastify.withTypeProvider<JsonSchemaToTsProvider>();
  const service = createAuthService(fastify);

  r.post(
    "/api/auth/register",
    { schema: registerSchema },
    async (req, reply) => {
      try {
        const { token } = await service.register(req.body);

        reply.setCookie("token", token, {
          httpOnly: true,
          secure: fastify.config.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });

        return { token };
      } catch (err) {
        reply.internalServerError()
      }
    }
  );

  r.post(    
    "/api/auth/login",
    { schema: loginSchema },
    async (req, reply) => {
      try {
        const { token } = await service.login(req.body);

        reply.setCookie("token", token, {
          httpOnly: true,
          secure: fastify.config.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });

        return { token };
      } catch (err) {
            reply.internalServerError()

        return { message: err?.message ?? "Login failed" } as any;
      }
    }
  );

  r.post("/api/auth/logout", async (_req, reply) => {
    reply.clearCookie("token", { path: "/" });
    reply.code(204);
    return null;
  });

  r.get("/api/auth/me", { preValidation: [fastify.authenticate] }, async (req) => {
    const payload = await req.jwtVerify();
    const { sub, email, name } = payload as any;
    return { id: sub, email, name: name ?? null };
  });
};

export default authRoutes;