import fp from "fastify-plugin";
import cron from "node-cron";
import { FastifyPluginAsync } from "fastify";
import { createFeedRepo } from "../modules/feedParser/services/feedRepo.service";
import { createFeedService } from "../modules/feedParser/services/feed.service";

function splitList(src?: string): string[] {
  return (src || "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function runBatched<T>(
  items: T[],
  batchSize: number,
  worker: (item: T) => Promise<void>
) {
  const size = Math.max(1, batchSize);
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    await Promise.allSettled(batch.map((it) => worker(it)));
  }
}

const feedsCronPlugin: FastifyPluginAsync = async (fastify) => {
  const cfg = (fastify as any).config || process.env;

  const enabled =
    String(cfg.ENABLE_FEEDS_CRON ?? "") === "1"; 
  if (!enabled) {
    fastify.log.info("feedsCron: disabled (set ENABLE_FEEDS_CRON=1 to enable)");
    return;
  }

  const urls = splitList(String(cfg.FEEDS_LIST ?? "")) || [];
  const expr = String(cfg.FEEDS_CRON ?? "*/15 * * * *"); 
  const timezone = String(cfg.TZ ?? "Europe/Oslo");
  const batchSize = Number(cfg.FEEDS_BATCH ?? 3); 

  if (urls.length === 0) {
    fastify.log.warn("feedsCron: FEEDS_LIST is empty — nothing to schedule");
    fastify.decorate("feedsCron", {
      async runOnce() {
        return {
          ok: [],
          err: [],
          count: { total: 0, ok: 0, err: 0 },
          durationMs: 0,
          note: "no feeds configured",
        };
      },
      stop() {},
    });
    return;
  }

  const repo = createFeedRepo(fastify.prisma);
  const service = createFeedService(repo);

  let running = false;

  const runOnce = async () => {
    if (running) {
      fastify.log.warn("[CRON] Previous run still in progress, skipping.");
      return {
        ok: [],
        err: [],
        count: { total: urls.length, ok: 0, err: 0 },
        durationMs: 0,
        skipped: true as const,
      };
    }

    running = true;
    const started = Date.now();
    const ok: string[] = [];
    const err: Array<{ url: string; error: string }> = [];

    await runBatched(urls, batchSize, async (url) => {
      try {
        await service.getFeed(url, true); 
        fastify.log.info({ url }, "[CRON] FEED OK");
        ok.push(url);
      } catch (e: any) {
        const msg = e?.message || String(e);
        fastify.log.error({ url, err: msg }, "[CRON] FEED ERR");
        err.push({ url, error: msg });
      }
    });

    const durationMs = Date.now() - started;
    const result = {
      ok,
      err,
      count: { total: urls.length, ok: ok.length, err: err.length },
      durationMs,
    };

    if (err.length) {
      fastify.log.warn({ ...result, batchSize }, "[CRON] Completed with errors");
    } else {
      fastify.log.info({ ...result, batchSize }, "[CRON] Completed successfully");
    }

    running = false;
    return result;
  };

  const task = cron.schedule(
    expr,
    () => {
      runOnce().catch((e) =>
        fastify.log.error({ err: e }, "[CRON] runOnce failed")
      );
    },
    { timezone }
  );

  fastify.addHook("onReady", async () => {
    fastify.log.info(
      `[CRON] Warm-up run (tz=${timezone}, expr=${expr}, feeds=${urls.length}, batch=${batchSize})`
    );
    try {
      await runOnce();
    } catch (e) {
      fastify.log.error({ err: e }, "[CRON] Warm-up failed");
    }
  });

  fastify.decorate("feedsCron", {
    runOnce,
    stop: () => {
      try {
        task.stop();
      } catch {}
    },
  });

  fastify.addHook("onClose", async () => {
    try {
      task.stop();
    } catch (err) {
      fastify.log.error({ err }, "[CRON] Failed to stop task");
    }
  });

  fastify.log.info(
    `feedsCron scheduled: ${expr}; feeds=${urls.length}; tz=${timezone}; batch=${batchSize}`
  );
};

export default fp(feedsCronPlugin, { name: "feeds-cron" });
