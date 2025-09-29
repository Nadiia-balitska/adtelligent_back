import { runFilters } from "../filters/index.js";

export async function getAd(fastify, userId, filters = {}) {
  let items = await fastify.prisma.lineItem.findMany({ where: { active: true } });

  items = await runFilters(items, { ...filters, fastify, userId });
  if (!items.length) return null;

  items.sort((a, b) => b.minCPM - a.minCPM);
  const winner = items[0];

  await fastify.prisma.impression.create({ data: { userId, lineItemId: winner.id } });
  await fastify.prisma.impressionCounter.upsert({
    where: { userId_lineItemId: { userId, lineItemId: winner.id } },
    update: { count: { increment: 1 } },
    create: { userId, lineItemId: winner.id, count: 1 },
  });

  return {
    lineItemId: winner.id,
    creativeUrl: winner.creativePath,
    size: winner.size,
    geo: winner.geo,
    adType: winner.adType,
    cpmRange: [winner.minCPM, winner.maxCPM],
  };
}
