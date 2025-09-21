import type { FastifyInstance } from "fastify";
import { schema, GetFeedQuery, GetFeedReply } from "../schemas/getFeedData.schema";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { parseFeed } from "../services/parseFeed.service";
import { FeedRepo } from "../services/feedRepo.service";

const FEED_DEFAULT_URL = process.env.FEED_DEFAULT_URL || "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml";
export async function getFeedDataRoutes(fastify: FastifyInstance) {
  const route = fastify.withTypeProvider<JsonSchemaToTsProvider>();

  route.get<{ Querystring: GetFeedQuery; Reply: GetFeedReply }>(
    "/feed",
    { schema },
    async (req, reply) => {
      const { url, force } = req.query;          
      const feedUrl = url ?? FEED_DEFAULT_URL;
      const isForce = force === 1;

      const repo = new FeedRepo(fastify.mongo.feeds);

      const toReply = (src: any): GetFeedReply => ({
        url: String(src.url),
        title: src.title ?? null,
        fetchedAt:
          typeof src.fetchedAt === "string"
            ? src.fetchedAt
            : new Date(src.fetchedAt ?? Date.now()).toISOString(),
        items: (src.items ?? []).map((i: any) => ({
          id: String(i.id ?? i.guid ?? i.link),
          title: String(i.title ?? ""),
          link: String(i.link ?? ""),
          content: i.content ?? i.contentSnippet ?? null,
          pubDate: i.pubDate ? new Date(i.pubDate).toISOString() : null,
        })),
      });

      if (isForce) {
        const parsed = await parseFeed(feedUrl);
        await repo.upsert(parsed);
        return reply.send(toReply(parsed));
      }

      const cached = await repo.findByUrl(feedUrl);
      if (cached) {
        return reply.send(toReply(cached));
      }

      const parsed = await parseFeed(feedUrl);
      await repo.upsert(parsed);
      return reply.send(toReply(parsed));
    },
  );
}
