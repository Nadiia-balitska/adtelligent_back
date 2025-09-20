import "fastify";
import type { MongoClient, Db, Collection } from "mongodb";

declare module "fastify" {
  interface FastifyInstance {
    mongo: {
      client: MongoClient;
      db: Db;
      feeds: Collection<any>;
    };
  }
}
