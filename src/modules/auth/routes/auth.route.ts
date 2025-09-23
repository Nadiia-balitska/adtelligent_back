import type { FastifyInstance } from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { registerSchema, loginSchema, type AuthBody, type AuthReply } from "../schemas/auth.schema";
import argon2 from "argon2";

const authRoutes = async (fastify: FastifyInstance) => {
  const r = fastify.withTypeProvider<JsonSchemaToTsProvider>();

  r.post<{ Body: AuthBody; Reply: AuthReply }>(
    "/api/auth/register",
    { schema: registerSchema },
    async (req, reply) => {
      const { email, password } = req.body;
      const exists = await fastify.prisma.user.findUnique({ where: { email } });
      if (exists) return reply.code(409).send({ message: "Email already used" } as any);

      const hash = await argon2.hash(password);
      const user = await fastify.prisma.user.create({ data: { email, password: hash } });
      const token = fastify.jwt.sign({ sub: user.id, email: user.email });
      return { token };
    }
  );

  r.post<{ Body: AuthBody; Reply: AuthReply }>(
    "/api/auth/login",
    { schema: loginSchema },
    async (req, reply) => {
      const { email, password } = req.body;
      const user = await fastify.prisma.user.findUnique({ where: { email } });
      if (!user || !(await argon2.verify(user.password, password))) {
        return reply.code(401).send({ message: "Invalid credentials" } as any);
      }
      const token = fastify.jwt.sign({ sub: user.id, email: user.email });
      return { token };
    }
  );
};

export default authRoutes;
