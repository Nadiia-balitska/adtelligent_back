import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { MongoClient } from "mongodb";


export default fp(async function mongoPlugin(fastify: FastifyInstance) {
  const url = fastify.config.MONGODB_URI;
  const dbName = fastify.config.MONGODB_DB;
  const collectionName = fastify.config.FEEDS_COLLECTION ?? "feeds";

  if (!url) {
    throw new Error("MONGODB_URI is not defined in configuration");
  }

  const client = new MongoClient(url);
  await client.connect();

  const db = client.db(dbName);
  const feeds = db.collection("feeds");

  await feeds.createIndex({ url: 1 }, { unique: true });

  fastify.decorate("mongo", { client, db, feeds });

  fastify.addHook("onClose", async () => {
    await client.close();
  });

  fastify.log.info("Mongo connected");
});
