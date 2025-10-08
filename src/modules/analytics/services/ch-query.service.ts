// src/modules/analytics/ch-query.ts
export type CHParams = {
  date_from: string;
  date_to: string;
  event?: string;
  bidder?: string;
  creativeId?: string;
  adUnitCode?: string;
  geo?: string;
  cpm_min?: number;
  cpm_max?: number;
};

const METRIC_MAP: Record<string, string> = {
  auctions: "sum(auctions) AS auctions",
  bids: "sum(bids) AS bids",
  wins: "sum(wins) AS wins",
  unique_users: "uniqExact(userId) AS unique_users",
  win_rate: "round(100 * sum(wins) / nullIf(sum(bids),0), 2) AS win_rate",
  avg_cpm: "round(avgIf(cpm, cpm > 0), 4) AS avg_cpm",
};

export function buildClickhouseQuery(
  dimensions: string[],   
  fields: string[],      
  params: CHParams
) {
  const TABLE = process.env.CLICKHOUSE_TABLE || "analytics.events";

  const dimSelect = [
    "toDate(time) AS date",
    dimensions.includes("hour") ? "toHour(time) AS hour" : null,
    dimensions.includes("event") ? "event" : null,
    dimensions.includes("bidder") ? "bidder" : null,
    dimensions.includes("creativeId") ? "creativeId" : null,
    dimensions.includes("adUnitCode") ? "adUnitCode" : null,
    dimensions.includes("geo") ? "geo" : null,
  ].filter(Boolean);

  const metricSelect = fields.map((f) => METRIC_MAP[f]).filter(Boolean);

  const selectClause = [...dimSelect, ...metricSelect].join(", ");

  const whereParts = [
    "time >= parseDateTimeBestEffort(:date_from)",
    "time < addDays(parseDateTimeBestEffort(:date_to), 1)",
    params.event ? "event = :event" : null,
    params.bidder ? "bidder = :bidder" : null,
    params.creativeId ? "creativeId = :creativeId" : null,
    params.adUnitCode ? "adUnitCode = :adUnitCode" : null,
    params.geo ? "geo = :geo" : null,
    typeof params.cpm_min === "number" ? "cpm >= :cpm_min" : null,
    typeof params.cpm_max === "number" ? "cpm <= :cpm_max" : null,
  ].filter(Boolean);

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

  const groupDims = ["date"]
    .concat(dimensions.includes("hour") ? ["hour"] : [])
    .concat(dimensions.filter((d) => !["hour"].includes(d)));
  const groupBy = groupDims.length ? `GROUP BY ${groupDims.join(", ")}` : "";

  const orderBy = `ORDER BY date${
    dimensions.includes("hour") ? ", hour" : ""
  }${dimensions.includes("bidder") ? ", bidder" : ""}`;

  const sql = `
    SELECT ${selectClause}
    FROM ${TABLE}
    ${whereClause}
    ${groupBy}
    ${orderBy}
  `.trim();

  return sql;
}
