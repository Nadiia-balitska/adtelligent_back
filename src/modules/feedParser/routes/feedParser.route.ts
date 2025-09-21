import type { FastifyInstance } from "fastify";
import { schema, GetFeedQuery, GetFeedReply } from "../schemas/getFeedData.schema";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { createFeedRepo } from "../services/feedRepo.service";  
import { createFeedService } from "../services/feed.service";     

const FALLBACK_FEED_URL = "https://www.pravda.com.ua/rss/";

export async function getFeedDataRoutes(fastify: FastifyInstance) {
  const route = fastify.withTypeProvider<JsonSchemaToTsProvider>();

  route.get<{ Querystring: GetFeedQuery; Reply: GetFeedReply }>(
    "/feed",
    { schema },
    async (req, reply) => {
      const feedUrl =
        req.query.url ??
        fastify.config?.FEED_DEFAULT_URL ??
        FALLBACK_FEED_URL;

      const isForce = req.query.force === 1;

      const repo = createFeedRepo(fastify.prisma);    
      const service = createFeedService(repo);

      const result = await service.getFeed(feedUrl, isForce);
      return reply.send(result);
    },
  );
}
