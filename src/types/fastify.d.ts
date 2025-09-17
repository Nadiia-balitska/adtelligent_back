import { Config } from '../config';

declare module 'fastify' {
    interface FastifyInstance {
        config: Config;
        pluginLoaded: (pluginName: string) => void;
    }
}