import type { FastifyInstance } from "fastify";
import type { ClickHouseQueryArgs, FastifyClickhouse } from "../types/analytics";

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

const DB = process.env.CLICKHOUSE_DB as string;
const TABLE = process.env.CLICKHOUSE_TABLE as string;

function getFullTableName(): string {
  return TABLE.includes(".") ? TABLE : `${DB}.${TABLE}`;
}

export function buildWhere(params: URLSearchParams): { whereSql: string; args: ClickHouseQueryArgs } {
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

function selectDimsSql(dimensions: string[]): string {
  return dimensions.map(d => (d === "hour" ? "toString(hour) AS hour" : d)).join(", ");
}

function aggsSql(): string {
  return `
    uniqExact(userId)                            AS unique_users,
    sum(event = 'auctionInit')                   AS auctions,
    sum(event = 'bidResponse')                   AS bids,
    sum(event = 'bidWon')                        AS wins,
    if(sum(event='auctionInit')=0, 0,
       round(sum(event='bidWon')/sum(event='auctionInit')*100, 2)) AS win_rate,
    if(countIf(event='bidWon')=0, 0,
       round(avgIf(cpm, event='bidWon'), 3))     AS avg_cpm
  `;
}

export async function getRecent(app: FastifyInstance) {
  const ch = requireClickhouse(app);
  const rs = await ch.query({
    query: `SELECT * FROM ${getFullTableName()} ORDER BY ts DESC LIMIT 100`,
    format: "JSONEachRow",
  });
  return rs.json();
}

export async function getReport(
  app: FastifyInstance,
  url: URL
): Promise<{ page: number; page_size: number; total: number; rows: Record<string, unknown>[] }> {
  const p = url.searchParams;

  const dimensions = (p.get("dimensions") ?? "date").split(",").filter(Boolean);
  if (!dimensions.includes("date")) dimensions.unshift("date");

  const fields = (p.get("fields") ?? "unique_users,auctions,bids,wins,win_rate,avg_cpm")
    .split(",").filter(Boolean);

  const page = Math.max(1, parseInt(p.get("page") ?? "1", 10));
  const pageSize = Math.min(500, Math.max(10, parseInt(p.get("page_size") ?? "100", 10)));
  const offset = (page - 1) * pageSize;

  const { whereSql, args } = buildWhere(p);

  const selectDims = selectDimsSql(dimensions);
  const groupBySql = dimensions.map(d => (d === "hour" ? "hour" : d)).join(", ");
  const orderBySql = groupBySql;

  const qData = `
    SELECT ${selectDims}, ${aggsSql()}
    FROM ${getFullTableName()}
    ${whereSql}
    GROUP BY ${groupBySql}
    ORDER BY ${orderBySql}
    LIMIT ${pageSize} OFFSET ${offset}
  `;
  const qCount = `
    SELECT count() AS total
    FROM (
      SELECT 1 FROM ${getFullTableName()}
      ${whereSql}
      GROUP BY ${groupBySql}
    )
  `;

  const ch = requireClickhouse(app);
  const [rows, totalRes] = await Promise.all([
    ch.query({ query: qData, format: "JSONEachRow", query_params: args }).then(r => r.json()),
    ch.query({ query: qCount, format: "JSONEachRow", query_params: args }).then(r => r.json()),
  ]);

  const total = Number(totalRes?.[0]?.total ?? 0);
  const allowed = new Set<string>([...dimensions, ...fields]);
  const shaped = (rows as Record<string, unknown>[]).map(r => {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(r)) if (allowed.has(k)) o[k] = (r as any)[k];
    return o;
  });

  return { page, page_size: pageSize, total, rows: shaped };
}

export async function getCsv(app: FastifyInstance, url: URL): Promise<string> {
  const p = url.searchParams;
  const dimensions = (p.get("dimensions") ?? "date").split(",").filter(Boolean);
  if (!dimensions.includes("date")) dimensions.unshift("date");

  const { whereSql, args } = buildWhere(p);
  const selectDims = selectDimsSql(dimensions);
  const groupBySql = dimensions.map(d => (d === "hour" ? "hour" : d)).join(", ");
  const orderBySql = groupBySql;

  const q = `
    SELECT ${selectDims},
           ${aggsSql()}
    FROM ${getFullTableName()}
    ${whereSql}
    GROUP BY ${groupBySql}
    ORDER BY ${orderBySql}
    FORMAT CSVWithNames
  `;

  const ch = requireClickhouse(app);
  const res = await ch.query({ query: q, query_params: args });
  return res.text();
}

export async function getRowsForXlsx(app: FastifyInstance, url: URL): Promise<Record<string, unknown>[]> {
  const p = url.searchParams;
  const dimensions = (p.get("dimensions") ?? "date").split(",").filter(Boolean);
  if (!dimensions.includes("date")) dimensions.unshift("date");
  const fields = (p.get("fields") ?? "unique_users,auctions,bids,wins,win_rate,avg_cpm")
    .split(",").filter(Boolean);

  const { whereSql, args } = buildWhere(p);
  const selectDims = selectDimsSql(dimensions);
  const groupBySql = dimensions.map(d => (d === "hour" ? "hour" : d)).join(", ");
  const orderBySql = groupBySql;

  const q = `
    SELECT ${selectDims},
           ${aggsSql()}
    FROM ${getFullTableName()}
    ${whereSql}
    GROUP BY ${groupBySql}
    ORDER BY ${orderBySql}
    FORMAT JSONEachRow
  `;

  const ch = requireClickhouse(app);
  const res = await ch.query({ query: q, query_params: args });
  const rows = (await res.json()) as Record<string, unknown>[];

  const allowed = new Set<string>([...dimensions, ...fields]);
  return rows.map(r => {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(r)) if (allowed.has(k)) o[k] = (r as any)[k];
    return o;
  });
}
