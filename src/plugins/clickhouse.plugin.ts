import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createClient, type ClickHouseClient } from "@clickhouse/client";

declare module "fastify" {
  interface FastifyInstance {
    clickhouse: ClickHouseClient;
  }
}

const DB_NAME = process.env.CLICKHOUSE_DB 
const TABLE_NAME = process.env.CLICKHOUSE_TABLE 

export default fp(async function clickhousePlugin(fastify: FastifyInstance) {
  const ch = createClient({
    url: process.env.CLICKHOUSE_URL || "http://localhost:8123", 
    username: process.env.CLICKHOUSE_USER || "default",
    password: process.env.CLICKHOUSE_PASSWORD || "",
  });

  try {
    await ch.exec({
      query: `CREATE DATABASE IF NOT EXISTS ${DB_NAME}`,
    });

    await ch.exec({
      query: `
CREATE TABLE IF NOT EXISTS ${DB_NAME}.${TABLE_NAME} (
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
) ENGINE = MergeTree
PARTITION BY toYYYYMM(date)
ORDER BY (date, hour, event, bidder, adUnitCode, creativeId, id)
SETTINGS index_granularity = 8192
      `,
    });

    fastify.log.info({ msg: "ClickHouse DB & table are ready" });
  } catch (err) {
    fastify.log.error({ err }, "Failed to init ClickHouse");
    throw err;
  }

  fastify.decorate("clickhouse", ch);

  fastify.addHook("onClose", async () => {
    await ch.close();
    fastify.log.info("ClickHouse connection closed");
  });
});
