import type { FastifyPluginAsync } from "fastify";

const ddl = `
CREATE DATABASE IF NOT EXISTS "analytics";

CREATE TABLE IF NOT EXISTS "analytics".stat_event (
  ts         DateTime           DEFAULT now(),
  date       Date               MATERIALIZED toDate(ts),
  hour       UInt8              MATERIALIZED toHour(ts),

  event      LowCardinality(String),
  userId     String,
  page       String,
  bidder     LowCardinality(String),
  creativeId String,
  adUnitCode LowCardinality(String),
  geo        LowCardinality(String),

  cpm        Nullable(Float64)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(date)
ORDER BY (event, date, hour, bidder, creativeId, adUnitCode, geo, userId)
SETTINGS index_granularity = 8192;
`;

const route: FastifyPluginAsync = async (fastify) => {
  fastify.post("/health/ch/init", async () => {
    const ch = fastify.clickhouse;
    // Виконуємо два запити послідовно — деякі інстанси не люблять multi-statement
    await ch.query({ query: `CREATE DATABASE IF NOT EXISTS "analytics"` });
    await ch.query({ query: ddl.split("CREATE DATABASE IF NOT EXISTS \"analytics\";").pop()! });
    return { ok: true };
  });

  fastify.get("/health/ch/check", async () => {
    const ch = fastify.clickhouse;
    const rs = await ch.query({
      query: `SELECT database, name FROM system.tables WHERE database = {db:String}`,
      query_params: { db: "analytics" },
      format: "JSONEachRow",
    });
    return rs.json();
  });
};

export default route;
