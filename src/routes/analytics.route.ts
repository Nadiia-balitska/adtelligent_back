import type { FastifyPluginAsync, FastifyInstance, FastifyReply } from "fastify";
import ExcelJS from "exceljs";
import {
  StatEvent,
  ReportQuery,
  ClickHouseQueryArgs,
  FastifyClickhouse,
} from "../types/analytics";

const DB = process.env.CLICKHOUSE_DB as string;
const TABLE = process.env.CLICKHOUSE_TABLE as string;
const BUFFER_MAX = Number(process.env.CH_BUFFER_MAX ?? 2000);
const FLUSH_MS = Number(process.env.CH_FLUSH_MS ?? 10000);

let buffer: Array<Required<Pick<StatEvent, "event">> & Omit<StatEvent, "event"> & { ts: number | string | Date; userId: string; page: string; bidder: string; creativeId: string; adUnitCode: string; geo: string }> = [];
let lastFlush = Date.now();
let flushing = false;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function flushToClickHouse(fastify: FastifyInstance) {
  if (flushing || buffer.length === 0) return;
  flushing = true;
  const chunk = buffer;
  buffer = [];
  let attempt = 0;
  let lastErr: unknown;

  while (attempt < 3) {
    try {
      await (fastify.clickhouse as unknown as FastifyClickhouse).insert({
        table: `${DB}.${TABLE}`,
        values: chunk.map((e) => ({
          ts: e.ts ? new Date(e.ts) : new Date(),
          event: e.event,
          userId: e.userId ?? "",
          page: e.page ?? "",
          bidder: e.bidder ?? "",
          creativeId: e.creativeId ?? "",
          adUnitCode: e.adUnitCode ?? "",
          geo: e.geo ?? "",
          cpm: typeof e.cpm === "number" ? e.cpm : null,
        })),
        format: "JSONEachRow",
      });
      lastErr = undefined;
      break;
    } catch (err) {
      lastErr = err;
      await sleep(300 * (attempt + 1));
      attempt++;
    }
  }

  if (lastErr) fastify.log.error({ err: lastErr }, "flushToClickHouse failed");

  lastFlush = Date.now();
  flushing = false;
}

function buildWhere(params: URLSearchParams): { whereSql: string; args: ClickHouseQueryArgs } {
  const args: ClickHouseQueryArgs = {};
  const where: string[] = [];

  const dateFrom = params.get("date_from");
  const dateTo = params.get("date_to");
  if (dateFrom) {
    where.push("date >= parseDateTimeBestEffort(:date_from)");
    args.date_from = dateFrom;
  }
  if (dateTo) {
    where.push("date <= parseDateTimeBestEffort(:date_to)");
    args.date_to = dateTo;
  }

  for (const f of ["event", "bidder", "creativeId", "adUnitCode", "geo"] as const) {
    const v = params.get(f);
    if (v) {
      where.push(`${f} = :${f}`);
      args[f] = v;
    }
  }

  const cpmMin = params.get("cpm_min");
  const cpmMax = params.get("cpm_max");
  if (cpmMin) {
    where.push("cpm >= :cpm_min");
    args.cpm_min = Number(cpmMin);
  }
  if (cpmMax) {
    where.push("cpm <= :cpm_max");
    args.cpm_max = Number(cpmMax);
  }

  return { whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "", args };
}

const analyticsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get("/stat/health", async () => ({ ok: true }));

  fastify.get("/stat", async () => {
    const r = await (fastify.clickhouse as unknown as FastifyClickhouse).query({
      query: `SELECT * FROM ${DB}.${TABLE} ORDER BY ts DESC LIMIT 100`,
      format: "JSONEachRow",
    });
    return r.json();
  });
fastify.addSchema({
  $id: "StatEvent",
  type: "object",
  required: ["event"],
  additionalProperties: false,
  properties: {
    event: { type: "string", minLength: 1 },
    ts: { type: ["number", "string", "null"] },
    userId: { type: ["string", "null"] },
    page: { type: ["string", "null"] },
    bidder: { type: ["string", "null"] },
    creativeId: { type: ["string", "null"] },
    adUnitCode: { type: ["string", "null"] },
    geo: { type: ["string", "null"] },
    cpm: { type: ["number", "null"] }
  }
});


   fastify.post<{ Body: StatEvent | StatEvent[]; Reply: { ok: true; queued: number } }>(
  "/stat/events",
  {
    schema: {
      body: {
        oneOf: [
          { $ref: "StatEvent#" },
          { type: "array", items: { $ref: "StatEvent#" } }
        ]
      }
    }
  },
  async (request, reply) => {
    const payload = request.body ?? {};
    const arr = Array.isArray(payload) ? payload : [payload];

    for (const ev of arr) {
      buffer.push({
        ts: (ev as any).timestamp ?? ev.ts ?? Date.now(),
        event: String(ev.event ?? ""),
        page: ev.page ?? "",
        bidder: ev.bidder ?? "",
        cpm: typeof ev.cpm === "number" ? ev.cpm : undefined,
        creativeId: ev.creativeId ?? "",
        adUnitCode: ev.adUnitCode ?? "",
        geo: ev.geo ?? "",
        userId: ev.userId ?? "",
      });
    }

    if (buffer.length >= BUFFER_MAX || Date.now() - lastFlush >= FLUSH_MS) {
      void flushToClickHouse(fastify);
    }
    return reply.send({ ok: true as const, queued: arr.length });
  }
);
 

  const timer: ReturnType<typeof setInterval> = setInterval(() => void flushToClickHouse(fastify), FLUSH_MS);
  timer.unref();

  fastify.addHook("onClose", async () => {
    await flushToClickHouse(fastify);
  });

  fastify.get<{ Querystring: ReportQuery; Reply: { page: number; page_size: number; total: number; rows: Record<string, unknown>[] } }>("/stat/report", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          date_from: { type: "string" },
          date_to: { type: "string" },
          dimensions: { type: "string", default: "date" },
          fields: { type: "string", default: "unique_users,auctions,bids,wins,win_rate,avg_cpm" },
          event: { type: "string" },
          bidder: { type: "string" },
          creativeId: { type: "string" },
          adUnitCode: { type: "string" },
          geo: { type: "string" },
          cpm_min: { type: "number" },
          cpm_max: { type: "number" },
          page: { type: "integer", minimum: 1, default: 1 },
          page_size: { type: "integer", minimum: 10, maximum: 500, default: 100 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const url = new URL(req.url, "http://x");
    const p = url.searchParams;

    const dimensions = (p.get("dimensions") ?? "date").split(",").filter(Boolean);
    if (!dimensions.includes("date")) dimensions.unshift("date");

    const fields = (p.get("fields") ?? "unique_users,auctions,bids,wins,win_rate,avg_cpm").split(",").filter(Boolean);

    const page = Math.max(1, parseInt(p.get("page") ?? "1", 10));
    const pageSize = Math.min(500, Math.max(10, parseInt(p.get("page_size") ?? "100", 10)));
    const offset = (page - 1) * pageSize;

    const { whereSql, args } = buildWhere(p);

    const selectDims = dimensions.map((d) => (d === "hour" ? "toString(hour) AS hour" : d)).join(", ");
    const selectAggs = `
      uniqExact(userId) AS unique_users,
      sum(event = 'auctionInit') AS auctions,
      sum(event = 'bidResponse') AS bids,
      sum(event = 'bidWon') AS wins,
      if(sum(event='auctionInit')=0, 0, round(sum(event='bidWon')/sum(event='auctionInit')*100, 2)) AS win_rate,
      if(countIf(event='bidWon')=0, 0, round(avgIf(cpm, event='bidWon'), 3)) AS avg_cpm
    `;
    const groupBySql = dimensions.map((d) => (d === "hour" ? "hour" : d)).join(", ");
    const orderBySql = groupBySql;

    const qData = `
      SELECT ${selectDims}, ${selectAggs}
      FROM ${DB}.${TABLE}
      ${whereSql}
      GROUP BY ${groupBySql}
      ORDER BY ${orderBySql}
      LIMIT ${pageSize} OFFSET ${offset}
    `;
    const qCount = `
      SELECT count() AS total
      FROM (
        SELECT 1 FROM ${DB}.${TABLE}
        ${whereSql}
        GROUP BY ${groupBySql}
      )
    `;

    const [rows, totalRes] = await Promise.all([
      (fastify.clickhouse as unknown as FastifyClickhouse).query({ query: qData, format: "JSONEachRow", query_params: args }).then((r: { json: () => any; }) => r.json()),
      (fastify.clickhouse as unknown as FastifyClickhouse).query({ query: qCount, format: "JSONEachRow", query_params: args }).then((r: { json: () => any; }) => r.json()),
    ]);

    const total = Number(totalRes?.[0]?.total ?? 0);
    const allowed = new Set<string>([...dimensions, ...fields]);
    const shaped = (rows as Record<string, unknown>[]).map((r) => {
      const o: Record<string, unknown> = {};
      for (const k of Object.keys(r)) if (allowed.has(k)) o[k] = (r as any)[k];
      return o;
    });

    return reply.send({ page, page_size: pageSize, total, rows: shaped });
  });

  fastify.get<{ Querystring: ReportQuery }>("/stat/export.csv", async (req, reply) => {
    const url = new URL(req.url, "http://x");
    const p = url.searchParams;

    const dimensions = (p.get("dimensions") ?? "date").split(",").filter(Boolean);
    if (!dimensions.includes("date")) dimensions.unshift("date");

    const { whereSql, args } = buildWhere(p);
    const selectDims = dimensions.map((d) => (d === "hour" ? "toString(hour) AS hour" : d)).join(", ");
    const groupBySql = dimensions.map((d) => (d === "hour" ? "hour" : d)).join(", ");
    const orderBySql = groupBySql;

    const q = `
      SELECT ${selectDims},
             uniqExact(userId) AS unique_users,
             sum(event = 'auctionInit') AS auctions,
             sum(event = 'bidResponse') AS bids,
             sum(event = 'bidWon') AS wins,
             if(sum(event='auctionInit')=0, 0, round(sum(event='bidWon')/sum(event='auctionInit')*100, 2)) AS win_rate,
             if(countIf(event='bidWon')=0, 0, round(avgIf(cpm, event='bidWon'), 3)) AS avg_cpm
      FROM ${DB}.${TABLE}
      ${whereSql}
      GROUP BY ${groupBySql}
      ORDER BY ${orderBySql}
      FORMAT CSVWithNames
    `;

    const res = await (fastify.clickhouse as unknown as FastifyClickhouse).query({ query: q, query_params: args });
    const csv = await res.text();

    reply
      .type("text/csv; charset=utf-8")
      .header("Content-Disposition", "attachment; filename=report.csv")
      .send(csv);
  });

  fastify.get<{ Querystring: ReportQuery }>("/stat/export.xlsx", async (req, reply: FastifyReply) => {
    const url = new URL(req.url, "http://x");
    const p = url.searchParams;

    const dimensions = (p.get("dimensions") ?? "date").split(",").filter(Boolean);
    if (!dimensions.includes("date")) dimensions.unshift("date");
    const fields = (p.get("fields") ?? "unique_users,auctions,bids,wins,win_rate,avg_cpm").split(",").filter(Boolean);

    const { whereSql, args } = buildWhere(p);
    const selectDims = dimensions.map((d) => (d === "hour" ? "toString(hour) AS hour" : d)).join(", ");
    const groupBySql = dimensions.map((d) => (d === "hour" ? "hour" : d)).join(", ");
    const orderBySql = groupBySql;

    const q = `
      SELECT ${selectDims},
             uniqExact(userId) AS unique_users,
             sum(event = 'auctionInit') AS auctions,
             sum(event = 'bidResponse') AS bids,
             sum(event = 'bidWon') AS wins,
             if(sum(event='auctionInit')=0, 0, round(sum(event='bidWon')/sum(event='auctionInit')*100, 2)) AS win_rate,
             if(countIf(event='bidWon')=0, 0, round(avgIf(cpm, event='bidWon'), 3)) AS avg_cpm
      FROM ${DB}.${TABLE}
      ${whereSql}
      GROUP BY ${groupBySql}
      ORDER BY ${orderBySql}
      FORMAT JSONEachRow
    `;

    const res = await (fastify.clickhouse as unknown as FastifyClickhouse).query({ query: q, query_params: args });
    const rows = (await res.json()) as Record<string, unknown>[];

    const allowed = new Set<string>([...dimensions, ...fields]);
    const shaped = rows.map((r) => {
      const o: Record<string, unknown> = {};
      for (const k of Object.keys(r)) if (allowed.has(k)) o[k] = (r as any)[k];
      return o;
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Report");
    if (shaped.length > 0) {
      ws.columns = Object.keys(shaped[0]).map((k) => ({ header: k, key: k }));
      shaped.forEach((row) => ws.addRow(row));
      ws.getRow(1).font = { bold: true };
      ws.columns?.forEach((c) => {
        c.width = Math.min(40, Math.max(10, String(c.header).length + 2));
        if (typeof c.width !== "number" || isNaN(c.width)) {
          c.width = 10;
        }
      });
    }

    reply.header("Content-Disposition", "attachment; filename=report.xlsx");
    reply.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    await wb.xlsx.write(reply.raw);
    reply.raw.end();
  });
};

export default analyticsRoute;
