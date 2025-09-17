import { FastifyServerOptions } from "fastify";
import Fastify from 'fastify';
import config from './config';
import AutoLoad from '@fastify/autoload';
import { join } from 'path';
import configPlugin from './config';
import getFeedDataRoutes from '../src/modules/feedParser/routes/feedParser.route.ts';

export type AppOptions = Partial<FastifyServerOptions>;
export async function buildApp (options:AppOptions={}) {
    const fastify = Fastify();
 await fastify.register(configPlugin);


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

    fastify.register(config);

fastify.get('/', async (request, reply) => {
  return {hello: 'world'}
});

fastify.register(getFeedDataRoutes);

    return fastify;

}
export default buildApp;