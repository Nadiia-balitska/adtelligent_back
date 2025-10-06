import type { FastifyInstance } from "fastify";
import { schema, GetFeedQuery, GetFeedReply } from "../schemas/getFeedData.schema";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { createFeedRepo } from "../services/feedRepo.service";  
import { createFeedService } from "../services/feed.service";     

const FALLBACK_FEED_URL = "https://www.pravda.com.ua/rss/";

export async function getFeedDataRoutes(fastify: FastifyInstance) {
  const route = fastify.withTypeProvider<JsonSchemaToTsProvider>();

route.get<{ Querystring: GetFeedQuery; Reply: GetFeedReply | { error: string; message: string } }>(
  "/feed",
  { schema },
  async (req, reply) => {
    const feedUrl =
      req.query.url ??
      fastify.config?.FEED_DEFAULT_URL ??
      FALLBACK_FEED_URL;

    const rawForce = (req.query as any).force;
    const isForce =
      rawForce === 1 || rawForce === '1' || rawForce === true || rawForce === 'true';

    fastify.log.info({ feedUrl, rawForce, isForce }, "GET /feed start");

    try {
      const repo = createFeedRepo(fastify.prisma);
      const service = createFeedService(repo);

      const result = await service.getFeed(feedUrl, isForce);
      fastify.log.info({ count: result.items.length }, "GET /feed ok");
      return reply.send(result);
    } catch (err: any) {
      fastify.log.error({ err }, "GET /feed failed");
      return reply.status(500).send({
        error: "FEED_FAILED",
        message: err?.message || String(err),
      });
    }
  },
);
}
