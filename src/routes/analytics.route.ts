import type { FastifyPluginAsync, FastifyInstance, FastifyReply } from "fastify";
import ExcelJS from "exceljs";

import type {
  StatEvent,
  ReportQuery,
  ClickHouseQueryArgs,
  FastifyClickhouse,
} from "../modules/analytics/types/analytics";
import {
  StatEventSchema,
  StatEventsBodySchema,
  ReportQuerySchema,
} from "../modules/analytics/schemas/analytics.schema";


type BufferedEvent =
  Required<Pick<StatEvent, "event">> &
  Omit<StatEvent, "event"> & {
    ts: number | string | Date;
    userId: string;
    page: string;
    bidder: string;
    creativeId: string;
    adUnitCode: string;
    geo: string;
  };

let buffer: BufferedEvent[] = [];
let lastFlush = Date.now();
let flushing = false;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type WithCH = FastifyInstance & { clickhouse?: FastifyClickhouse | null };

function requireClickhouse(app: FastifyInstance): FastifyClickhouse {
  const ch = (app as WithCH).clickhouse ?? null;
  if (!ch) {
    const err = new Error("ClickHouse is not configured") as Error & { statusCode?: number };
    err.statusCode = 503;
    throw err;
  }
  return ch;
}

function buildWhere(params: URLSearchParams): { whereSql: string; args: ClickHouseQueryArgs } {
  const args: ClickHouseQueryArgs = {};
  const where: string[] = [];

  const dateFrom = params.get("date_from");
  const dateTo = params.get("date_to");
  if (dateFrom) { where.push("date >= parseDateTimeBestEffort(:date_from)"); args.date_from = dateFrom; }
  if (dateTo)   { where.push("date <= parseDateTimeBestEffort(:date_to)");   args.date_to   = dateTo;   }

  for (const f of ["event", "bidder", "creativeId", "adUnitCode", "geo"] as const) {
    const v = params.get(f);
    if (v) { where.push(`${f} = :${f}`); (args as any)[f] = v; }
  }

  const cpmMin = params.get("cpm_min");
  const cpmMax = params.get("cpm_max");
  if (cpmMin) { where.push("cpm >= :cpm_min"); args.cpm_min = Number(cpmMin); }
  if (cpmMax) { where.push("cpm <= :cpm_max"); args.cpm_max = Number(cpmMax); }

  return { whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "", args };
}


const analyticsRoute: FastifyPluginAsync = async (fastify) => {
  const DB = fastify.config.CLICKHOUSE_DB ?? process.env.CLICKHOUSE_DB;
  const TABLE = fastify.config.CLICKHOUSE_TABLE ?? process.env.CLICKHOUSE_TABLE;
  const BUFFER_MAX = fastify.config.CH_BUFFER_MAX ?? process.env.CH_BUFFER_MAX ?? 2000;
  const FLUSH_MS = fastify.config.CH_FLUSH_MS ?? process.env.CH_FLUSH_MS ?? 10000;

  if (!DB || !TABLE) {
    fastify.log.warn("CLICKHOUSE_DB / CLICKHOUSE_TABLE are not set — analytics routes may fail.");
  }

  fastify.addSchema(StatEventSchema);

  fastify.get("/stat/health", async () => ({ ok: true }));

  fastify.get("/stat", async () => {
    const ch = requireClickhouse(fastify);
    const r = await ch.query({
      query: `SELECT * FROM ${DB}.${TABLE} ORDER BY ts DESC LIMIT 100`,
      format: "JSONEachRow",
    });
    return r.json();
  });

  fastify.post<{ Body: StatEvent | StatEvent[]; Reply: { ok: true; queued: number } }>(
    "/stat/events",
    { schema: { body: StatEventsBodySchema } },
    async (request, reply) => {
      const payload = request.body;
      const events = Array.isArray(payload) ? payload : [payload];

      for (const ev of events) {
        const maybeTs = (ev as StatEvent & { timestamp?: StatEvent["ts"] }).timestamp;
        const ts = maybeTs ?? ev.ts ?? Date.now();

        buffer.push({
          ts,
          event: ev.event,
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
      return reply.send({ ok: true as const, queued: events.length });
    }
  );

  const timer = setInterval(() => void flushToClickHouse(fastify), FLUSH_MS);
  timer.unref();

  fastify.addHook("onClose", async () => { await flushToClickHouse(fastify); });

  fastify.get<{
    Querystring: ReportQuery;
    Reply: { page: number; page_size: number; total: number; rows: Record<string, unknown>[] };
  }>(
    "/stat/report",
    { schema: { querystring: ReportQuerySchema } },
    async (req, reply) => {
      const url = new URL(req.url, "http://x");
      const p = url.searchParams;

      const dimensions = (p.get("dimensions") ?? "date").split(",").filter(Boolean);
      if (!dimensions.includes("date")) dimensions.unshift("date");

      const fields = (p.get("fields") ?? "unique_users,auctions,bids,wins,win_rate,avg_cpm")
        .split(",").filter(Boolean);

      const page = Math.max(1, parseInt(p.get("page") ?? "1", 10));
      const pageSize = Math.min(500, Math.max(10, parseInt(p.get("page_size") ?? "100", 10)));
      const offset = (page - 1) * pageSize;

      const { whereSql, args } = buildWhere(p);

      const selectDims = dimensions.map(d => (d === "hour" ? "toString(hour) AS hour" : d)).join(", ");
      const selectAggs = `
        uniqExact(userId) AS unique_users,
        sum(event = 'auctionInit') AS auctions,
        sum(event = 'bidResponse') AS bids,
        sum(event = 'bidWon') AS wins,
        if(sum(event='auctionInit')=0, 0, round(sum(event='bidWon')/sum(event='auctionInit')*100, 2)) AS win_rate,
        if(countIf(event='bidWon')=0, 0, round(avgIf(cpm, event='bidWon'), 3)) AS avg_cpm
      `;
      const groupBySql = dimensions.map(d => (d === "hour" ? "hour" : d)).join(", ");
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

      const ch = requireClickhouse(fastify);
      const [rows, totalRes] = await Promise.all([
        ch.query({ query: qData, format: "JSONEachRow", query_params: args }).then(r => r.json() as Promise<Array<Record<string, unknown>>>),
        ch.query({ query: qCount, format: "JSONEachRow", query_params: args }).then(r => r.json() as Promise<Array<Record<string, unknown>>>),
      ]);

      const total = Number(totalRes?.[0]?.total ?? 0);
      const allowed = new Set<string>([...dimensions, ...fields]);
      const shaped = rows.map(r => {
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(r)) if (allowed.has(k)) out[k] = r[k];
        return out;
      });

      return reply.send({ page, page_size: pageSize, total, rows: shaped });
    }
  );

  fastify.get<{ Querystring: ReportQuery }>(
    "/stat/export.csv",
    { schema: { querystring: ReportQuerySchema } },
    async (req, reply) => {
      const url = new URL(req.url, "http://x");
      const p = url.searchParams;

      const dimensions = (p.get("dimensions") ?? "date").split(",").filter(Boolean);
      if (!dimensions.includes("date")) dimensions.unshift("date");

      const { whereSql, args } = buildWhere(p);
      const selectDims = dimensions.map(d => (d === "hour" ? "toString(hour) AS hour" : d)).join(", ");
      const groupBySql = dimensions.map(d => (d === "hour" ? "hour" : d)).join(", ");
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

      const ch = requireClickhouse(fastify);
      const res = await ch.query({ query: q, query_params: args });
      const csv = await res.text();

      reply
        .type("text/csv; charset=utf-8")
        .header("Content-Disposition", "attachment; filename=report.csv")
        .send(csv);
    }
  );

  fastify.get<{ Querystring: ReportQuery }>(
    "/stat/export.xlsx",
    { schema: { querystring: ReportQuerySchema } },
    async (req, reply: FastifyReply) => {
      const url = new URL(req.url, "http://x");
      const p = url.searchParams;

      const dimensions = (p.get("dimensions") ?? "date").split(",").filter(Boolean);
      if (!dimensions.includes("date")) dimensions.unshift("date");
      const fields = (p.get("fields") ?? "unique_users,auctions,bids,wins,win_rate,avg_cpm").split(",").filter(Boolean);

      const { whereSql, args } = buildWhere(p);
      const selectDims = dimensions.map(d => (d === "hour" ? "toString(hour) AS hour" : d)).join(", ");
      const groupBySql = dimensions.map(d => (d === "hour" ? "hour" : d)).join(", ");
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

      const ch = requireClickhouse(fastify);
      const rows = (await (await ch.query({ query: q, query_params: args })).json()) as Array<Record<string, unknown>>;

      const allowed = new Set<string>([...dimensions, ...fields]);
      const shaped = rows.map(r => {
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(r)) if (allowed.has(k)) out[k] = r[k];
        return out;
      });

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Report");
      if (shaped.length > 0) {
        ws.columns = Object.keys(shaped[0]).map(k => ({ header: k, key: k }));
        shaped.forEach(row => ws.addRow(row));
        ws.getRow(1).font = { bold: true };
        ws.columns?.forEach(c => {
          c.width = Math.min(40, Math.max(10, String(c.header).length + 2));
          if (typeof c.width !== "number" || Number.isNaN(c.width)) c.width = 10;
        });
      }

      reply.header("Content-Disposition", "attachment; filename=report.xlsx");
      reply.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      await wb.xlsx.write(reply.raw);
      reply.raw.end();
    }
  );

  async function flushToClickHouse(app: FastifyInstance): Promise<void> {
    if (flushing || buffer.length === 0) return;

    flushing = true;
    const chunk = buffer;
    buffer = [];

    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const ch = requireClickhouse(app);
        await ch.insert({
          table: `${DB}.${TABLE}`,
          values: chunk.map(e => ({
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
      }
    }

    if (lastErr) app.log.error({ err: lastErr }, "flushToClickHouse failed");

    lastFlush = Date.now();
    flushing = false;
  }
};

export default analyticsRoute;
