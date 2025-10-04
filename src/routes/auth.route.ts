import type { FastifyPluginAsync } from "fastify";
import authRoutes from "../modules/auth/routes/auth.route";

const routes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(authRoutes, { prefix: "/api/auth" });


};

export default routes;

