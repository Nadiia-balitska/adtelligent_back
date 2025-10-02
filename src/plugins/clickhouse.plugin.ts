import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createClient, type ClickHouseClient } from "@clickhouse/client";

declare module "fastify" {
  interface FastifyInstance { clickhouse: ClickHouseClient }
}

const DB = process.env.CLICKHOUSE_DB || "adstats";
const TABLE = process.env.CLICKHOUSE_TABLE || "stat_event";

export default fp(async function clickhousePlugin(app: FastifyInstance) {
  const client = createClient({
    url: process.env.CLICKHOUSE_URL || "http://localhost:8123",
    username: process.env.CLICKHOUSE_USER || "default",
    password: process.env.CLICKHOUSE_PASSWORD || "",
  });

  await client.exec({ query: `CREATE DATABASE IF NOT EXISTS ${DB}` });

  await client.exec({
    query: `
CREATE TABLE IF NOT EXISTS ${DB}.${TABLE} (
  id          UUID         DEFAULT generateUUIDv4(),
  ts          DateTime     DEFAULT now(),
  date        Date         MATERIALIZED toDate(ts),
  hour        UInt8        MATERIALIZED toHour(ts),

  event       LowCardinality(String),
  userId      String,
  page        String,
  bidder      LowCardinality(String),
  creativeId  String,
  adUnitCode  String,
  geo         LowCardinality(String),

  cpm         Float64
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(date)
ORDER BY (date, hour, event, bidder, adUnitCode, creativeId, id)
SETTINGS index_granularity = 8192
-- TTL date + INTERVAL 90 DAY DELETE   -- розкоментуй, якщо треба автоприбирання
`,
  });

  app.decorate("clickhouse", client);
  app.addHook("onClose", async () => { await client.close(); });
}, { name: "clickhouse-plugin" });
