import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { registerSchema, loginSchema } from "../schemas/auth.schema";
import type { FromSchema } from "json-schema-to-ts";

type RegisterBody = FromSchema<typeof registerSchema.body>;
type LoginBody  = FromSchema<typeof loginSchema.body>;
type TokenReply   = FromSchema<typeof registerSchema.response[200]>;

function httpError(statusCode: number, message: string) {
  const err = new Error(message) as Error & { statusCode?: number };
  err.statusCode = statusCode;
  return err;
}

export function createAuthService(fastify: FastifyInstance) {
  const prisma = fastify.prisma;

  return {
    async register({ email, password, name }: RegisterBody): Promise<TokenReply> {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) throw httpError(409, "Email already used");

      const hash = await argon2.hash(password);

      const user = await prisma.user.create({
        data: { email, password: hash, ...(name ? { name } : {}) },
      });

      const token = fastify.jwt.sign({
        sub: user.id,
        email: user.email,
        name: user.name ?? null,
      });

      return { token };
    },

    async login({ email, password }: LoginBody): Promise<TokenReply> {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !(await argon2.verify(user.password, password))) {
        throw httpError(401, "Invalid credentials");
      }

      const token = fastify.jwt.sign({
        sub: user.id,
        email: user.email,
        name: user.name ?? null,
      });

      return { token };
    },
  };
}