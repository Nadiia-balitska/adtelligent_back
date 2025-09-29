import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { healthSchema, healthDbSchema } from '../schemas/health.schema';

async function pingDatabase(prisma: PrismaClient) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, via: 'queryRaw' as const };
  } catch (sqlErr: any) {
    const anyPrisma = prisma as any;
    if (typeof anyPrisma.$runCommandRaw === 'function') {
      try {
        await anyPrisma.$runCommandRaw({ ping: 1 });
        return { ok: true, via: 'runCommandRaw' as const };
      } catch (mongoErr: any) {
        return { ok: false, via: 'runCommandRaw', error: String(mongoErr?.message || mongoErr) };
      }
    }
    return { ok: false, via: 'queryRaw', error: String(sqlErr?.message || sqlErr) };
  }
}

const healthPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', { schema: healthSchema }, async (_req, reply) => {
    let prismaStatus: 'ok' | 'down' | 'unknown' = 'unknown';

    try {
      if (fastify.prisma) {
        const res = await pingDatabase(fastify.prisma);
        prismaStatus = res.ok ? 'ok' : 'down';
        if (!res.ok) fastify.log.error({ res }, 'DB ping failed');
      }
    } catch (err) {
      prismaStatus = 'down';
      fastify.log.error({ err }, 'Prisma health failed');
    }

    const overallOk = prismaStatus === 'ok';
    reply.code(overallOk ? 200 : 200); 

    return {
      status: overallOk ? 'ok' : 'degraded',
      prisma: prismaStatus,
      uptime: process.uptime()
    };
  });

  fastify.get('/health/db', { schema: healthDbSchema }, async (_req, reply) => {
    try {
      const res = await pingDatabase(fastify.prisma as PrismaClient);
      if (!res.ok) {
        reply.code(503);
        return { status: 'down', error: res.error ?? `via=${res.via}` };
      }
      return { status: 'ok' };
    } catch (err: any) {
      fastify.log.error({ err }, 'DB health failed');
      reply.code(503);
      return { status: 'down', error: String(err?.message || err) };
    }
  });
};

export default fp(healthPlugin, { name: 'health-plugin' });
