import Fastify, {FastifyServerOptions} from "fastify";
import {join} from "node:path";
import AutoLoad from "@fastify/autoload";
import configPlugin from "./config";
export type AppOptions = Partial<FastifyServerOptions>

async function buildApp(options: AppOptions = {}){

  const isProd = process.env.NODE_ENV === "production";

  const fastify = Fastify({logger: isProd
      ? true
      : {
          transport: {
            target: "pino-pretty",
            options: { colorize: true, singleLine: true, translateTime: "HH:MM:ss" },
          },
        },
    trustProxy: true})

    await  fastify.register(configPlugin)

    try {
        fastify.decorate("pluginLoaded", (pluginName: string) => {
            fastify.log.info(`✅ Plugin loaded: ${pluginName}`);
        });

        fastify.log.info("Starting to load plugins");
        await fastify.register(AutoLoad, {
            dir: join(__dirname, "plugins"),
            options: options,
            ignorePattern: /^((?!plugin).)*$/,
        });

        fastify.log.info("✅ Plugins loaded successfully");
    } catch (error) {
        fastify.log.error("Error in autoload:", error);
        throw error;
    }

await fastify.register(AutoLoad, {
    dir: join(__dirname, "routes"),
    options,
    dirNameRoutePrefix: false, 
  });

    fastify.get("/", async (request, reply) => {
        return {hello: "world"}
    })

    // fastify.register(getFeedDataRoutes) // я винесла в інший файл routes/feed.ts

    fastify.get("/health/server", async () => ({ status: "ok" }));
 
    
  fastify.get("/health/db", async (req, reply) => {
    try {
      if (fastify.prisma?.$queryRaw) {
        await fastify.prisma.$queryRaw`SELECT 1`;
         await fastify.mongo.client.db().command({ ping: 1 });
        return { status: "ok" };
      }
      return { status: "unknown" };
    } catch (err) {
      fastify.log.error({ err }, "DB health failed");
      reply.code(500);
      return { status: "down" };
    }
  });

  fastify.setErrorHandler((err, _req, reply) => {
    fastify.log.error({ err }, "Unhandled error");
    reply.code(err.statusCode ?? 500).send({ message: "Internal Server Error" });
  });

    return fastify
}

export default buildApp