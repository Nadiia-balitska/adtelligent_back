import type { FastifyInstance } from 'fastify';
import { createFeedRepo } from '../feedParser/services/feedRepo.service';
import { createFeedService } from '../feedParser/services/feed.service';


export async function refreshFeeds(app: FastifyInstance, urls: string[]) {
  const repo = createFeedRepo(app.prisma);
  const service = createFeedService(repo);

  const ok: string[] = [];
  const err: Array<{ url: string; error: string }> = [];

  for (const url of urls) {
    const ts = new Date().toISOString();
    try {
      await service.getFeed(url, true); 
      app.log.info(`[${ts}] FEED OK ${url}`);
      ok.push(url);
    } catch (e: any) {
      const msg = e?.message || String(e);
      app.log.error(`[${ts}] FEED ERR ${url}: ${msg}`);
      err.push({ url, error: msg });
    }
  }
  return { ok, err };
}
