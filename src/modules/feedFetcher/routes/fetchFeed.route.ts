import type { FastifyPluginAsync } from "fastify";
import { registerFeedsCron } from "../schedule";

const fetchFeedRoutes: FastifyPluginAsync = async (fastify) => {
  const cronCtl = registerFeedsCron(fastify);

  fastify.post("/feeds/refresh", async (_req, reply) => {
    const result = await cronCtl.runOnce(); 
    return reply.send({
      status: "ok",
      ...result,
    });
  });
};

export default fetchFeedRoutes;
