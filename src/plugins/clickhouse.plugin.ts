import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createClient, type ClickHouseClient } from "@clickhouse/client";
import type { FastifyClickhouse } from "../modules/analytics/types/analytics";

const URL  = process.env.CLICKHOUSE_URL!;
const DB   = process.env.CLICKHOUSE_DB!;
const USER = process.env.CLICKHOUSE_USER || "default";
const PASS = process.env.CLICKHOUSE_PASSWORD || "";

const CONNECT_TIMEOUT_MS = Number(process.env.CLICKHOUSE_CONNECT_TIMEOUT_MS ?? 3000);
const MAX_INIT_MS        = Number(process.env.CLICKHOUSE_MAX_INIT_MS ?? 9000);

async function pingWithTimeout(client: ClickHouseClient, ms: number): Promise<boolean> {
  return Promise.race<boolean>([
    client.ping().then(() => true).catch(() => false),
    new Promise((resolve) => setTimeout(() => resolve(false), ms)),
  ]);
}

function wrapClient(ch: ClickHouseClient): FastifyClickhouse {
  return {
    async insert(input) {
      await ch.insert(input as any);
    },
    async query(input) {
      return ch.query(input as any) as unknown as {
        json(): Promise<any>;
        text(): Promise<string>;
      };
    },
    async ping() {
      await ch.ping();
    },
  };
}

export default fp(async function clickhousePlugin(app: FastifyInstance) {
  if (!URL || !DB) {
    app.log.warn("CLICKHOUSE_URL/CLICKHOUSE_DB not set — CH plugin will not be attached");
    return;
  }

  const raw: ClickHouseClient = createClient({
    host: URL,
    username: USER,
    password: PASS,
    database: DB,
  });

  const t0 = Date.now();
  while (!(await pingWithTimeout(raw, CONNECT_TIMEOUT_MS))) {
    if (Date.now() - t0 > MAX_INIT_MS) {
      throw new Error(`ClickHouse ping timeout after ${MAX_INIT_MS}ms`);
    }
  }

  const ch: FastifyClickhouse = wrapClient(raw);

  app.decorate<FastifyClickhouse>("clickhouse", ch);

  app.addHook("onClose", async () => {
    try { await raw.close(); } catch {}
  });

  app.log.info({ url: URL, db: DB }, "ClickHouse connected");
});
