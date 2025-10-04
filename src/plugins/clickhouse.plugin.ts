import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createClient, type ClickHouseClient } from "@clickhouse/client";

declare module "fastify" {
  interface FastifyInstance {
    clickhouse: ClickHouseClient;
  }
}

const DB   = process.env.CLICKHOUSE_DB        || "nadia_db_clickhouse";
const TBL  = process.env.CLICKHOUSE_TABLE     || "stat_event";
const URL  = process.env.CLICKHOUSE_URL       || "";
const USER = process.env.CLICKHOUSE_USER      || "default";
const PASS = process.env.CLICKHOUSE_PASSWORD  || "";

const CONNECT_TIMEOUT_MS = Number(process.env.CLICKHOUSE_CONNECT_TIMEOUT_MS || 3000);
const MAX_INIT_MS        = Number(process.env.CLICKHOUSE_MAX_INIT_MS || 9000);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function pingWithTimeout(client: ClickHouseClient, ms: number): Promise<boolean> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    await client.ping();
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export default fp(async function clickhousePlugin(app: FastifyInstance) {
  if (!URL) {
    app.log.warn("CLICKHOUSE_URL is empty — skipping ClickHouse init.");
    return;
  }

  const client = createClient({ url: URL, username: USER, password: PASS });

  const reachable = await pingWithTimeout(client, CONNECT_TIMEOUT_MS);
  if (!reachable) {
    app.log.warn({ url: URL }, "ClickHouse is unreachable. Server will start without CH.");
    app.decorate("clickhouse", client);
    app.addHook("onClose", async () => { await client.close(); });
    return;
  }

  const ddl = async () => {
    await client.exec({ query: `CREATE DATABASE IF NOT EXISTS \`${DB}\`` });
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
  };

  const abort = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("CH init timeout")), MAX_INIT_MS)
  );

  try {
    await Promise.race([ddl(), abort]);
    app.log.info({ db: DB, table: TBL, url: URL }, "ClickHouse ready");
  } catch (err) {
    app.log.warn({ err }, "ClickHouse init failed. Server continues without CH.");
  }

  app.decorate("clickhouse", client);

  app.addHook("onClose", async () => {
    await client.close();
    app.log.info("ClickHouse connection closed");
  });
}, { name: "clickhouse-plugin" });
