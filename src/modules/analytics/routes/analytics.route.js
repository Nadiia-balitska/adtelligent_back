import ExcelJS from "exceljs";

const DB = process.env.CLICKHOUSE_DB || "adstats";
const TABLE = process.env.CLICKHOUSE_TABLE || "stat_event";
const BUFFER_MAX = Number(process.env.CH_BUFFER_MAX || 2000);
const FLUSH_MS = Number(process.env.CH_FLUSH_MS || 10000);

let buffer = [];
let lastFlush = Date.now();
let flushing = false;

async function flushToClickHouse(fastify) {
  if (flushing || buffer.length === 0) return;
  flushing = true;

  const chunk = buffer;
  buffer = [];

  let attempt = 0, lastErr;
  while (attempt < 3) {
    try {
      await fastify.clickhouse.insert({
        table: `${DB}.${TABLE}`,
        values: chunk.map((e) => ({
          ts: e.ts ? new Date(e.ts) : new Date(),
          event: e.event,
          userId: e.userId || "",
          page: e.page || "",
          bidder: e.bidder || "",
          creativeId: e.creativeId || "",
          adUnitCode: e.adUnitCode || "",
          geo: e.geo || "",
          cpm: typeof e.cpm === "number" ? e.cpm : null,
        })),
        format: "JSONEachRow",
      });
      lastErr = undefined;
      break;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
    attempt++;
  }
  if (lastErr) fastify.log.error({ err: lastErr }, "flushToClickHouse failed");

  lastFlush = Date.now();
  flushing = false;
}

function buildWhere(params) {
  const args = {};
  const where = [];

  const dateFrom = params.get("date_from");
  const dateTo   = params.get("date_to");
  if (dateFrom) { where.push("date >= parseDateTimeBestEffort(:date_from)"); args.date_from = dateFrom; }
  if (dateTo)   { where.push("date <= parseDateTimeBestEffort(:date_to)");   args.date_to   = dateTo;   }

  for (const f of ["event","bidder","creativeId","adUnitCode","geo"]) {
    const v = params.get(f);
    if (v) { where.push(`${f} = :${f}`); args[f] = v; }
  }

  const cpmMin = params.get("cpm_min");
  const cpmMax = params.get("cpm_max");
  if (cpmMin) { where.push("cpm >= :cpm_min"); args.cpm_min = Number(cpmMin); }
  if (cpmMax) { where.push("cpm <= :cpm_max"); args.cpm_max = Number(cpmMax); }

  return { whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "", args };
}

export default async function analyticsRoute(fastify) {
  fastify.get("/stat/health", async () => ({ ok: true }));

  fastify.get("/stat", async () => {
    const r = await fastify.clickhouse.query({
      query: `SELECT * FROM ${DB}.${TABLE} ORDER BY ts DESC LIMIT 100`,
      format: "JSONEachRow",
    });
    return r.json();
  });

  fastify.post("/stat/events", {
    schema: {
      body: {
        oneOf: [
          {
            type: "object",
            required: ["event"],
            properties: {
              event: { type: "string", minLength: 1 },
              ts: { type: ["number","string"], nullable: true },
              userId: { type: "string", nullable: true },
              page: { type: "string", nullable: true },
              bidder: { type: "string", nullable: true },
              creativeId: { type: "string", nullable: true },
              adUnitCode: { type: "string", nullable: true },
              geo: { type: "string", nullable: true },
              cpm: { type: "number", nullable: true },
            }
          },
          { type: "array", items: { $ref: "#/components/schemas/Event" } }
        ],
        components: {
          schemas: {
            Event: {
              type: "object",
              required: ["event"],
              properties: {
                event: { type: "string", minLength: 1 },
                ts: { type: ["number","string"], nullable: true },
                userId: { type: "string", nullable: true },
                page: { type: "string", nullable: true },
                bidder: { type: "string", nullable: true },
                creativeId: { type: "string", nullable: true },
                adUnitCode: { type: "string", nullable: true },
                geo: { type: "string", nullable: true },
                cpm: { type: "number", nullable: true },
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const payload = request.body || {};
    const arr = Array.isArray(payload) ? payload : [payload];

    for (const ev of arr) {
      buffer.push({
        ts: ev.timestamp ?? ev.ts ?? Date.now(),
        event: String(ev.event || ""),
        page: ev.page || "",
        bidder: ev.bidder || "",
        cpm: typeof ev.cpm === "number" ? ev.cpm : undefined,
        creativeId: ev.creativeId || "",
        adUnitCode: ev.adUnitCode || "",
        geo: ev.geo || "",
        userId: ev.userId || "",
      });
    }

    if (buffer.length >= BUFFER_MAX || Date.now() - lastFlush >= FLUSH_MS) {
      void flushToClickHouse(fastify);
    }
    return reply.send({ ok: true, queued: arr.length });
  });

  setInterval(() => void flushToClickHouse(fastify), FLUSH_MS).unref();
  fastify.addHook("onClose", async () => { await flushToClickHouse(fastify); });

  fastify.get("/stat/report", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          date_from: { type: "string" },
          date_to:   { type: "string" },
          dimensions:{ type: "string", default: "date" },
          fields:    { type: "string", default: "unique_users,auctions,bids,wins,win_rate,avg_cpm" },
          event:     { type: "string" },
          bidder:    { type: "string" },
          creativeId:{ type: "string" },
          adUnitCode:{ type: "string" },
          geo:       { type: "string" },
          cpm_min:   { type: "number" },
          cpm_max:   { type: "number" },
          page:      { type: "integer", minimum: 1, default: 1 },
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

    const fields = (p.get("fields") ?? "unique_users,auctions,bids,wins,win_rate,avg_cpm")
      .split(",").filter(Boolean);

    const page = Math.max(1, parseInt(p.get("page") ?? "1", 10));
    const pageSize = Math.min(500, Math.max(10, parseInt(p.get("page_size") ?? "100", 10)));
    const offset = (page - 1) * pageSize;

    const { whereSql, args } = buildWhere(p);

    const selectDims = dimensions
      .map((d) => (d === "hour" ? "toString(hour) AS hour" : d))
      .join(", ");

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
      fastify.clickhouse.query({ query: qData, format: "JSONEachRow", query_params: args }).then(r => r.json()),
      fastify.clickhouse.query({ query: qCount, format: "JSONEachRow", query_params: args }).then(r => r.json()),
    ]);

    const total = Number(totalRes?.[0]?.total ?? 0);

    const allowed = new Set([...dimensions, ...fields]);
    const shaped = rows.map((r) => {
      const o = {};
      for (const k of Object.keys(r)) if (allowed.has(k)) o[k] = r[k];
      return o;
    });

    return reply.send({ page, page_size: pageSize, total, rows: shaped });
  });

  //  Експорт CSV
  fastify.get("/stat/export.csv", async (req, reply) => {
    const url = new URL(req.url, "http://x");
    const p = url.searchParams;

    const dimensions = (p.get("dimensions") ?? "date").split(",").filter(Boolean);
    if (!dimensions.includes("date")) dimensions.unshift("date");
    const fields = (p.get("fields") ?? "unique_users,auctions,bids,wins,win_rate,avg_cpm")
      .split(",").filter(Boolean);

    const { whereSql, args } = buildWhere(p);
    const selectDims = dimensions
      .map((d) => (d === "hour" ? "toString(hour) AS hour" : d))
      .join(", ");
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
    const res = await fastify.clickhouse.query({ query: q, query_params: args });
    const csv = await res.text();

    reply
      .type("text/csv; charset=utf-8")
      .header("Content-Disposition", "attachment; filename=report.csv")
      .send(csv);
  });

  //  Експорт  Excel
  fastify.get("/stat/export.xlsx", async (req, reply) => {
    const url = new URL(req.url, "http://x");
    const p = url.searchParams;

    const dimensions = (p.get("dimensions") ?? "date").split(",").filter(Boolean);
    if (!dimensions.includes("date")) dimensions.unshift("date");
    const fields = (p.get("fields") ?? "unique_users,auctions,bids,wins,win_rate,avg_cpm")
      .split(",").filter(Boolean);

    const { whereSql, args } = buildWhere(p);
    const selectDims = dimensions
      .map((d) => (d === "hour" ? "toString(hour) AS hour" : d))
      .join(", ");
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

    const res = await fastify.clickhouse.query({ query: q, query_params: args });
    const rows = await res.json();

    const allowed = new Set([...dimensions, ...fields]);
    const shaped = rows.map((r) => {
      const o = {};
      for (const k of Object.keys(r)) if (allowed.has(k)) o[k] = r[k];
      return o;
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Report");
    if (shaped.length > 0) {
      ws.columns = Object.keys(shaped[0]).map((k) => ({ header: k, key: k }));
      shaped.forEach((row) => ws.addRow(row));
      ws.getRow(1).font = { bold: true };
      ws.columns?.forEach((c) => (c.width = Math.min(40, Math.max(10, String(c.header).length + 2))));
    }

    reply.header("Content-Disposition", "attachment; filename=report.xlsx");
    reply.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    await wb.xlsx.write(reply.raw);
    reply.raw.end();
  });
}
