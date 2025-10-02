import type { FastifyInstance } from "fastify";

const DB  = process.env.CLICKHOUSE_DB  || "nadia_db_clickhouse";
const TBL = process.env.CLICKHOUSE_TABLE || "stat_event";

export default async function clickhouseDebugRoutes(fastify: FastifyInstance) {
  const requireCH = () => {
    const ch = fastify.clickhouse;
    if (!ch) {
      if ((fastify as any).httpErrors) {
        throw fastify.httpErrors.serviceUnavailable("ClickHouse is not configured");
      }
      const err = new Error("ClickHouse is not configured") as Error & { statusCode?: number };
      err.statusCode = 503;
      throw err;
    }
    return ch;
  };

  fastify.get("/debug/ch/ping", async () => {
    const ch = requireCH();
    await ch.ping();
    return { ok: true };
  });

  fastify.get("/debug/ch/tables", async () => {
    const ch = requireCH();
    const rs = await ch.query({
      query: `SELECT name FROM system.tables WHERE database = {db:String}`,
      query_params: { db: DB },
      format: "JSONEachRow",
    });
    return rs.json<{ name: string }[]>();
  });

  fastify.post("/debug/ch/insert-one", async () => {
    const ch = requireCH();
    await ch.insert({
      table: `\`${DB}\`.\`${TBL}\``,
      values: [{
        event: "debug",
        userId: "tester",
        page: "/debug",
        bidder: "testBidder",
        creativeId: "crea-1",
        adUnitCode: "adunit-1",
        geo: "UA",
        cpm: 0,
      }],
      format: "JSONEachRow",
    });
    return { ok: true };
  });

  fastify.get("/debug/ch/select", async () => {
    const ch = requireCH();
    const rs = await ch.query({
      query: `SELECT * FROM \`${DB}\`.\`${TBL}\` ORDER BY ts DESC LIMIT 10`,
      format: "JSONEachRow",
    });
    return rs.json<Record<string, unknown>[]>();
  });
}
