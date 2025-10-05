import type { FastifyPluginAsync } from "fastify";
import { getFeedDataRoutes } from "../modules/feedParser/routes/feedParser.route";
import fetchFeedRoutes from "../modules/feedFetcher/routes/fetchFeed.route";

const routes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(getFeedDataRoutes);


  await fastify.register(fetchFeedRoutes);
};

export default routes;

