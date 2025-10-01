import fp from "fastify-plugin";
import cors from "@fastify/cors";
import type { FastifyPluginAsync } from "fastify";
 
const corsPlugin: FastifyPluginAsync = async (fastify) => {
  const allowList: (string | RegExp)[] = [];

  if (fastify.config?.FRONTEND_URL) allowList.push(fastify.config.FRONTEND_URL);

  allowList.push(/.*\.vercel\.app$/);

  allowList.push("http://localhost:3000");

  await fastify.register(cors, {
    origin(origin, cb) {
      if (!origin) return cb(null, true); 
      const ok = allowList.some((o) =>
        o instanceof RegExp ? o.test(origin) : o === origin
      );
      cb(ok ? null : new Error("CORS: Origin not allowed"), ok);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
};

export default fp(corsPlugin, { name: "cors-plugin" });
