//тут  в мене GET /api/feed (ендпоінт для отримання фіда)


import type { FastifyPluginAsync } from "fastify";
import { getFeedDataRoutes } from "../modules/feedParser/routes/feedParser.route";

const routes: FastifyPluginAsync = async (app) => {
  await app.register(getFeedDataRoutes, { prefix: "/api" });
};

export default routes;

