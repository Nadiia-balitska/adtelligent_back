import fp from "fastify-plugin";
import cors from "@fastify/cors";
import type { FastifyPluginAsync } from "fastify";

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  const envList = (fastify.config?.VITE_API_URL as string | undefined)?.split(",")
    .map(s => s.trim())
    .filter(Boolean) ?? [];

  const allowList: (string | RegExp)[] = [
    ...envList,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    /^https?:\/\/.*\.vercel\.app$/,
    /^https?:\/\/.*\.railway\.app$/,
  ];

  await fastify.register(cors, {
    origin(origin, cb) {
      if (!origin) return cb(null, true); 
      const allowed = allowList.some((rule) =>
        rule instanceof RegExp ? rule.test(origin) : rule === origin
      );
      cb(allowed ? null : new Error(`CORS: origin not allowed: ${origin}`), allowed);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  });
};

export default fp(corsPlugin, { name: "cors-plugin" });
