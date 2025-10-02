import "fastify";

declare module "fastify" {
 type AppConfig = {
  FEED_DEFAULT_URL?: string | null;
  MONGODB_DB?: string;
  FEEDS_COLLECTION?: string;
  VITE_API_URL?: string | null;
  PORT: number;
  HOST: string;
  MONGODB_URI: string;
  JWT_SECRET: string;
  FEEDS_LIST?: string;
  FEEDS_CRON?: string;
};
}
