import type { FastifyPluginAsync } from 'fastify';
import { registerFeedsCron } from '../services/schedule';

const fetchFeedRoutes: FastifyPluginAsync = async (fastify) => {
  const cronCtl = registerFeedsCron(fastify);

  fastify.route({
    method: ['POST', 'GET'],
    url: '/feed/refresh',
    schema: {
      tags: ['feed'],
      summary: 'Force refresh all feeds',
      description: 'Triggers one-time refresh of all configured feeds.',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            ok: { type: 'array', items: { type: 'string' } },
            err: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string' },
                  error: { type: 'string' }
                },
                required: ['url', 'error'],
                additionalProperties: false
              }
            },
            count: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                ok: { type: 'integer' },
                err: { type: 'integer' }
              },
              required: ['total', 'ok', 'err'],
              additionalProperties: false
            },
            durationMs: { type: 'integer' }
          },
          required: ['status', 'ok', 'err'],
          additionalProperties: true
        }
      }
    },
    handler: async (_req, reply) => {
      const result = await cronCtl.runOnce();
      return reply.code(200).send({ status: 'ok', ...result });
    }
  });
};

export default fetchFeedRoutes;
