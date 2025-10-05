import type { FastifyInstance } from "fastify";

export default async function clickhouseHealthRoutes(fastify: FastifyInstance) {
  const DB  = fastify.config?.CLICKHOUSE_DB  ?? process.env.CLICKHOUSE_DB  ?? "";
  const TBL = fastify.config?.CLICKHOUSE_TABLE ?? process.env.CLICKHOUSE_TABLE ?? "";

  const ch = fastify.clickhouse; 

  fastify.get("/health/ch/ping", async () => {
    await ch.ping();
    return { ok: true };
  });

  fastify.get("/health/ch/tables", async () => {
    const rs = await ch.query({
      query: `SELECT name FROM system.tables WHERE database = {db:String}`,
      query_params: { db: DB },
      format: "JSONEachRow",
    });
    const rows = (await rs.json()) as Array<{ name: string }>;
    return rows;
  });

  fastify.post("/health/ch/insert-one", async () => {
    await ch.insert({
      table: `\`${DB}\`.\`${TBL}\``,
      values: [
        {
          event: "debug",
          userId: "tester",
          page: "/debug",
          bidder: "testBidder",
          creativeId: "crea-1",
          adUnitCode: "adunit-1",
          geo: "UA",
          cpm: 0,
        },
      ],
      format: "JSONEachRow",
    });
    return { ok: true };
  });

  fastify.get("/health/ch/select", async () => {
    const rs = await ch.query({
      query: `SELECT * FROM \`${DB}\`.\`${TBL}\` ORDER BY ts DESC LIMIT 10`,
      format: "JSONEachRow",
    });
    const rows = (await rs.json()) as Array<Record<string, unknown>>;
    return rows;
  });
}
