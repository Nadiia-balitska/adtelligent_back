import Fastify, {FastifyServerOptions} from "fastify";
import {join} from "node:path";
import AutoLoad from "@fastify/autoload";
import configPlugin from "./config";
import clickHouse from "./clickHouse";
import fastifyStatic from '@fastify/static';
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
    await  fastify.register(clickHouse)


    try {
        fastify.decorate("pluginLoaded", (pluginName: string) => {
            fastify.log.info(`✅ Plugin loaded: ${pluginName}`);
        });

        fastify.log.info("Starting to load plugins");

        await fastify.register(AutoLoad, {
            dir: join(__dirname, "plugins"),
            options,
            ignorePattern: /^((?!plugin).)*$/,
        });

        fastify.log.info("✅ Plugins loaded successfully");
    } catch (error) {
        fastify.log.error("Error in autoload:", error);
        throw error;
    }
    
  fastify.get("/health/server", async () => ({ status: "ok" }));



  await fastify.register(AutoLoad, 
    { dir: join(__dirname, "routes"),
    options,
    dirNameRoutePrefix: false, 
    ignorePattern: /^((?!route).)*$/ 
  });

    await fastify.register(fastifyStatic, {
  root: join(process.cwd(), 'public'),
  prefix: '/',
});

  fastify.setErrorHandler((err, _req, reply) => {
    fastify.log.error({ err }, "Unhandled error");
    reply.code(err.statusCode ?? 500).send({ message: "Internal Server Error" });
  });


  // це всьо перенети в роути окремі.
//   fastify.get("/stat", async () => {
//     const rows=fastify.clickHouse.query({
// query: `SELECT * FROM system.metrics LIMIT 100`,
// format: "JSONEachRow"

//     })
//     return rows.json();
//   });

// const cash = new Set();
// const timer = Date.now()

// fastify.post("/stat/events", async (request, reply) => {
//   const { event, geo, userId } = request.body;

//   cash.add({ event, geo, userId });

//   if (cash.size > 2000 || Date.now() - timer > 10000) {
//     await fastify.clickHouse.insert({
//       table: "stat_event",
//       values: Array.from(cash).map(item => ({
//         event: item.event,
//         geo: item.geo,
//         userId: item.userId
//       }))
//     });
//     cash.clear();
//   }

//   reply.send({ status: "event received" });
// });

    return fastify
}

export default buildApp