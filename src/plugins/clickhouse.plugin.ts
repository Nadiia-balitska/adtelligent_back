import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createClient, type ClickHouseClient } from "@clickhouse/client";

declare module "fastify" {
  interface FastifyInstance {
    clickhouse: ClickHouseClient;
  }
}

const DB   = process.env.CLICKHOUSE_DB  || "nadia_db_clickhouse"; 
const TBL  = process.env.CLICKHOUSE_TABLE || "stat_event";        
const URL  = process.env.CLICKHOUSE_URL  || "";
const USER = process.env.CLICKHOUSE_USER || "default";
const PASS = process.env.CLICKHOUSE_PASSWORD || "";

async function execWithRetry<T>(run: () => Promise<T>, tries = 5, baseDelayMs = 400): Promise<T> {
  let err: unknown;
  for (let i = 0; i < tries; i++) {
    try { return await run(); }
    catch (e) {
      err = e;
      await new Promise(r => setTimeout(r, baseDelayMs * (i + 1)));
    }
  }
  throw err;
}

export default fp(async function clickhousePlugin(app: FastifyInstance) {
  if (!URL) {
    app.log.error("CLICKHOUSE_URL is empty. Set it in .env");
    throw new Error("CLICKHOUSE_URL missing");
  }

  const client = createClient({
    url: URL,             
    username: USER,
    password: PASS,
  });

  await execWithRetry(() =>
    client.exec({ query: `CREATE DATABASE IF NOT EXISTS \`${DB}\`` }) // ★ бектики
  );

  await execWithRetry(() =>
    client.exec({
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
SETTINGS index_granularity = 8192;
      `, 
    })
  );

  app.decorate("clickhouse", client);

  app.addHook("onClose", async () => {
    await client.close();
    app.log.info("ClickHouse connection closed");
  });

  app.log.info({ db: DB, table: TBL, url: URL }, "ClickHouse ready");
}, { name: "clickhouse-plugin" });
