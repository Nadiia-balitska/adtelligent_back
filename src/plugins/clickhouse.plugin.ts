import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createClient, type ClickHouseClient } from "@clickhouse/client";

declare module "fastify" {
  interface FastifyInstance {
    clickhouse: ClickHouseClient | null;
  }
}

const DB   = process.env.CLICKHOUSE_DB;
const TBL  = process.env.CLICKHOUSE_TABLE;
const URL  = process.env.CLICKHOUSE_URL;
const USER = process.env.CLICKHOUSE_USER;
const PASS = process.env.CLICKHOUSE_PASSWORD;

const CONNECT_TIMEOUT_MS = Number(process.env.CLICKHOUSE_CONNECT_TIMEOUT_MS || 3000);
const MAX_INIT_MS        = Number(process.env.CLICKHOUSE_MAX_INIT_MS || 9000);

async function pingWithTimeout(client: ClickHouseClient, ms: number): Promise<boolean> {
  return Promise.race([
    client.ping().then(() => true).catch(() => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms))
  ]);
}

export default fp(async function clickhousePlugin(app: FastifyInstance) {
  if (!URL) {
    app.log.warn("CLICKHOUSE_URL is empty — skipping ClickHouse init.");
    app.decorate("clickhouse", null);
    return;
  }

  const client = createClient({ url: URL, username: USER, password: PASS });

  let connected = await pingWithTimeout(client, CONNECT_TIMEOUT_MS);
  if (!connected) {
    app.log.warn({ url: URL }, "⚠️ ClickHouse is unreachable. Continuing without CH.");
    app.decorate("clickhouse", null);
    return;
  }

  try {
    await Promise.race([
      client.exec({ query: `CREATE DATABASE IF NOT EXISTS \`${DB}\`` }),
      new Promise((_r, reject) => setTimeout(() => reject(new Error("CH init timeout")), MAX_INIT_MS))
    ]);

    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS \`${DB}\`.\`${TBL}\`
        (
          id         UUID      DEFAULT generateUUIDv4(),
          ts         DateTime  DEFAULT now(),
          date       Date      MATERIALIZED toDate(ts),
          hour       UInt8     MATERIALIZED toHour(ts),
          event      LowCardinality(String),
          userId     String,
          page       String,
          bidder     LowCardinality(String),
          creativeId String,
          adUnitCode String,
          geo        LowCardinality(String),
          cpm        Float64
        )
        ENGINE = MergeTree
        PARTITION BY toYYYYMM(date)
        ORDER BY (date, hour, event, bidder, adUnitCode, creativeId, id)
        SETTINGS index_granularity = 8192
      `,
    });

    app.log.info({ db: DB, table: TBL, url: URL }, "✅ ClickHouse ready");
    app.decorate("clickhouse", client);
  } catch (err) {
    app.log.error({ err }, "❌ ClickHouse init failed. Continuing without CH.");
    app.decorate("clickhouse", null);
  }

  app.addHook("onClose", async () => {
    try {
      await client.close();
      app.log.info("ClickHouse connection closed");
    } catch {}
  });
}, { name: "clickhouse-plugin" });
