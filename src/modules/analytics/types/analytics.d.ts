import type { FastifyInstance } from "fastify";

export interface StatEvent {
  event: string;
  ts?: number | string | Date | null;
  timestamp?: number | string | Date | null; 
  userId?: string | null;
  page?: string | null;
  bidder?: string | null;
  creativeId?: string | null;
  adUnitCode?: string | null;
  geo?: string | null;
  cpm?: number | null;
}

export interface ReportQuery {
  date_from?: string;
  date_to?: string;
  dimensions?: string;
  fields?: string;
  event?: string;
  bidder?: string;
  creativeId?: string;
  adUnitCode?: string;
  geo?: string;
  cpm_min?: number;
  cpm_max?: number;
  page?: number;
  page_size?: number;
}



export type ClickHouseQueryArgs = Record<string, string | number | null | undefined>;

export interface FastifyClickhouse {
  insert(input: {
    table: string;
    values: unknown[];
    format?: "JSONEachRow";
  }): Promise<void>;
  query(input: {
    query: string;
    format?: "JSONEachRow";
    query_params?: ClickHouseQueryArgs;
  }): Promise<{
    json(): Promise<any>;
    text(): Promise<string>;
  }>;
   ping(): Promise<void>;
}

declare module "fastify" {
  interface FastifyInstance {
    clickhouse: FastifyClickhouse;
  }
}


