"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeedDataRoutes = getFeedDataRoutes;
const getFeedData_schema_1 = require("../schemas/getFeedData.schema");
const feedRepo_service_1 = require("../services/feedRepo.service");
const feed_service_1 = require("../services/feed.service");
const FALLBACK_FEED_URL = "https://www.pravda.com.ua/rss/";
async function getFeedDataRoutes(fastify) {
    const route = fastify.withTypeProvider();
    route.get("/api/feed", { schema: getFeedData_schema_1.schema }, async (req, reply) => {
        const feedUrl = req.query.url ??
            fastify.config?.FEED_DEFAULT_URL ??
            FALLBACK_FEED_URL;
        const isForce = req.query.force === 1;
        const repo = (0, feedRepo_service_1.createFeedRepo)(fastify.prisma);
        const service = (0, feed_service_1.createFeedService)(repo);
        const result = await service.getFeed(feedUrl, isForce);
        return reply.send(result);
    });
}
