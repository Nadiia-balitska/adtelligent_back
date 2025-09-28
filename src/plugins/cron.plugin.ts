import fp from "fastify-plugin";
import cron from "node-cron";
import { createFeedService } from "../modules/feedParser/services/feed.service";
import { createFeedRepo } from "../modules/feedParser/services/feedRepo.service";

export default fp(async (fastify) => {
  cron.schedule("*/15 * * * *", async () => {
    try {
      fastify.log.info("[CRON] Refreshing feeds...");

      const repo = createFeedRepo(fastify.prisma);
      const service = createFeedService(repo);

      const urls = [
        "https://www.pravda.com.ua/rss/",
        "https://www.epravda.com.ua/rss/",
      ];

      for (const url of urls) {
        await service.getFeed(url, true); 
        fastify.log.info(`[CRON] Refreshed: ${url}`);
      }
    } catch (err) {
      fastify.log.error(`[CRON] Failed: ${err.message}`);
    }
  });
});
