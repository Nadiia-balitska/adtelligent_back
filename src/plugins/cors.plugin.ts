import fp from "fastify-plugin";
import cors from "@fastify/cors";
import type { FastifyPluginAsync } from "fastify";

const corsPlugin: FastifyPluginAsync = async (fastify) => {
  const envOrigin = fastify.config?.VITE_API_URL?.trim(); 
  const allowList: (string | RegExp)[] = [];

  if (envOrigin?.startsWith("http")) allowList.push(envOrigin);

  allowList.push("http://localhost:5173");
  allowList.push("http://127.0.0.1:5173");
  allowList.push("http://localhost:3000");
  allowList.push(/^https?:\/\/([a-z0-9-]+\.)*vercel\.app$/i);

  await fastify.register(cors, {
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    origin(origin, cb) {
      if (!origin) return cb(null, true); 
      const ok = allowList.some((rule) =>
        rule instanceof RegExp ? rule.test(origin) : rule === origin
      );
      cb(ok ? null : new Error(`CORS: Origin not allowed: ${origin}`), ok);
    },
  });
};

export default fp(corsPlugin, { name: "cors-plugin" });
