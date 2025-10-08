import cron from 'node-cron';
import type { FastifyInstance } from 'fastify';
import { getFeedsConfig } from '../configs/feeds.config';
import { refreshFeeds } from './fetchFeeds';

export function registerFeedsCron(app: FastifyInstance) {
  const { list, cron: expr } = getFeedsConfig(app.config || process.env as any);

  if (!list.length) {
    app.log.warn('FEEDS_LIST is empty — feeds cron is not scheduled');
    return {
      async runOnce() {
        return { ok: [], err: [], note: 'no feeds configured' as const };
      }
    };
  }

  const runOnce = () => refreshFeeds(app, list);

  runOnce().catch(err => app.log.error(err));

  cron.schedule(expr, () => {
    runOnce().catch(err => app.log.error(err));
  });

  app.log.info(`Feeds cron scheduled: ${expr}; feeds=${list.length}`);

  return { runOnce };
}
