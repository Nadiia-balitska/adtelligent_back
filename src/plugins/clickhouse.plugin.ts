import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createClient, type ClickHouseClient } from "@clickhouse/client";
import type { FastifyClickhouse } from "../modules/analytics/types/analytics";

declare module "fastify" {
  interface FastifyInstance {
    clickhouse: FastifyClickhouse;
  }
}

const DB   = process.env.CLICKHOUSE_DB;
const TBL  = process.env.CLICKHOUSE_TABLE;
const URL  = process.env.CLICKHOUSE_URL;
const USER = process.env.CLICKHOUSE_USER;
const PASS = process.env.CLICKHOUSE_PASSWORD;

const CONNECT_TIMEOUT_MS = Number(process.env.CLICKHOUSE_CONNECT_TIMEOUT_MS || 3000);
const MAX_INIT_MS        = Number(process.env.CLICKHOUSE_MAX_INIT_MS || 9000);

async function pingWithTimeout(client: ClickHouseClient, ms: number): Promise<boolean> {
  return Promise.race([
    client.ping().then(() => true).catch(() => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms)),
  ]);
}
