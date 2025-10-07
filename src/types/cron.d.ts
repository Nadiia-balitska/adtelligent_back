
export type FeedRefreshError = { url: string; error: string };

export interface FeedsCronRunResult {
  ok: string[];
  err: FeedRefreshError[];
  count: { total: number; ok: number; err: number };
  durationMs: number;
  skipped?: boolean;
  note?: string;
}

export interface FeedsCronController {
  runOnce: () => Promise<FeedsCronRunResult>;
  stop: () => void;
}

declare module "fastify" {
  interface FastifyInstance {
    feedsCron?: FeedsCronController;
  }
}
