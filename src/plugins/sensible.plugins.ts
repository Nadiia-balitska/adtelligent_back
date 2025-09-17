import { FastifyInstance } from 'fastify';
import sensible from '@fastify/sensible';
import fp from 'fastify-plugin';

const pluginName = 'sensible-plugin';

export default fp(
    async (fastify: FastifyInstance) => {
            await fastify.register(sensible)
        
            fastify.pluginLoaded(pluginName);
        },
    {
        name: 'pluginName',
    },
);