"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeedDataRoutes = getFeedDataRoutes;
const getFeedData_schema_1 = require("../schemas/getFeedData.schema");
const parseFeed_service_1 = require("../services/parseFeed.service");
const feedRepo_service_1 = require("../services/feedRepo.service");
const DEFAULT_URL = "https://www.pravda.com.ua/rss/view_news/";
async function getFeedDataRoutes(fastify) {
    const route = fastify.withTypeProvider();
    route.get("/feed", { schema: getFeedData_schema_1.schema }, async (req, reply) => {
        const url = req.query.url ?? DEFAULT_URL;
        const force = Boolean(req.query.force);
        const repo = new feedRepo_service_1.FeedRepo(fastify.mongo.feeds);
        const toReply = (src) => ({
            url: String(src.url),
            title: src.title ?? null,
            fetchedAt: typeof src.fetchedAt === "string"
                ? src.fetchedAt
                : new Date(src.fetchedAt ?? Date.now()).toISOString(),
            items: (src.items ?? []).map((i) => ({
                id: String(i.id ?? i.guid ?? i.link),
                title: String(i.title ?? ""),
                link: String(i.link ?? ""),
                content: i.content ?? i.contentSnippet ?? null,
                pubDate: i.pubDate ? new Date(i.pubDate).toISOString() : null,
            })),
        });
        if (force) {
            const parsed = await (0, parseFeed_service_1.parseFeed)(url);
            await repo.upsert(parsed);
            return reply.send(toReply(parsed));
        }
        const cached = await repo.findByUrl(url);
        if (cached) {
            return reply.send(toReply(cached));
        }
        const parsed = await (0, parseFeed_service_1.parseFeed)(url);
        await repo.upsert(parsed);
        return reply.send(toReply(parsed));
    });
}
