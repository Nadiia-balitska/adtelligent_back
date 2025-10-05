import fp from "fastify-plugin";
import cron from "node-cron";
import { createFeedService } from "../modules/feedParser/services/feed.service";
import { createFeedRepo } from "../modules/feedParser/services/feedRepo.service";

export default fp(async (fastify) => {
  const urls = [
    "https://www.pravda.com.ua/rss/",
    "https://www.epravda.com.ua/rss/",
  ];

  let running = false;

  const task = cron.schedule(
    "*/15 * * * *",
    async () => {
      if (running) {
        fastify.log.warn("[CRON] Previous run still in progress, skipping.");
        return;
      }
      running = true;

      try {
        fastify.log.info("[CRON] Refreshing feeds...");

        const repo = createFeedRepo(fastify.prisma);
        const service = createFeedService(repo);

        const results = await Promise.allSettled(
          urls.map(async (url) => {
            try {
              await service.getFeed(url, true);
              fastify.log.info(`[CRON] Refreshed: ${url}`);
            } catch (err) {
              fastify.log.error({ err, url }, "[CRON] FEED ERR");
            }
          })
        );

        const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
        if (rejected.length) {
          fastify.log.warn(`[CRON] Completed with ${rejected.length} errors`);
        } else {
          fastify.log.info("[CRON] Completed successfully");
        }
      } catch (err) {
        fastify.log.error({ err }, "[CRON] Top-level failure");
      } finally {
        running = false;
      }
    },
    { timezone: "Europe/Oslo" }
  );

  fastify.addHook("onClose", async () => {
    try {
      task.stop();
    } catch (err) {
      fastify.log.error({ err }, "[CRON] Failed to stop task");
    }
  });
});
