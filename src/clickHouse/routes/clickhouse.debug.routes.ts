import type { FastifyPluginAsync } from "fastify";

const DB = process.env.CLICKHOUSE_DB || "adstats";
const TABLE = process.env.CLICKHOUSE_TABLE || "stat_event";

const routes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/events", async () => {
    await fastify.clickhouse.insert({
      table: `${DB}.${TABLE}`,
      values: [
        {
          ts: new Date(),
          event: "test",
          userId: "debug-user",
          page: "/debug",
          bidder: "balitska",
          creativeId: "crea-1",
          adUnitCode: "div-gpt-top",
          geo: "UA",
          cpm: 1.23,
        },
      ],
      format: "JSONEachRow",
    });
    return { status: "ok" };
  });

  fastify.get("/event", async () => {
    const r = await fastify.clickhouse
      .query({
        query: `SELECT * FROM ${DB}.${TABLE} ORDER BY ts DESC LIMIT 10`,
        format: "JSONEachRow",
      })
      .then((res) => res.json());
    return r;
  });
};

export default routes;
