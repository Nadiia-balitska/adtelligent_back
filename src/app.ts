import Fastify, {FastifyServerOptions} from "fastify";
import {join} from "node:path";
import AutoLoad from "@fastify/autoload";
import configPlugin from "./config";
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

fastify.addHook("onRoute", (r) => {
  fastify.log.info(`[ROUTE] ${r.method} ${r.url}`);
});

fastify.addHook("onRegister", (inst, opts) => {
  // @ts-ignore
  const pfx = opts?.prefix ? ` (prefix: ${opts.prefix})` : "";
  fastify.log.info(`[PLUGIN] register${pfx}`);
});
    
    await fastify.register(fastifyStatic, {
  root: join(process.cwd(), 'public'),
  prefix: '/',
});

  fastify.get("/health/server", async () => ({ status: "ok" }));


    await  fastify.register(configPlugin)


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
    
// await fastify.register(AutoLoad, {
//   dir: join(__dirname, "modules"),
//   options: { prefix: "/api" },
//   maxDepth: 5,
//   dirNameRoutePrefix: false,              
//   ignorePattern: /^(?!.*\.(plugin|route)\.).*$/, 
// });



  await fastify.register(AutoLoad,
    { dir: join(__dirname, "routes"),
      options,
    ignorePattern: /^((?!route).)*$/ 
  });




await fastify.ready();
fastify.log.info("\n" + fastify.printRoutes());


  // fastify.setErrorHandler((err, _req, reply) => {
  //   fastify.log.error({ err }, "Unhandled error");
  //   reply.code(err.statusCode ?? 500).send({ message: "Internal Server Error" });
  // });


    return fastify
    
}

export default buildApp