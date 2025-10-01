export async function frequencyFilter(items, ctx) {
  const { fastify, userId } = ctx;
  if (!items.length) return items;

  const counters = await fastify.prisma.impressionCounter.findMany({
    where: { userId, lineItemId: { in: items.map(i => i.id) } },
  });
  const seen = new Map(counters.map(c => [c.lineItemId, c.count]));
  return items.filter(i => (seen.get(i.id) ?? 0) < i.frequencyCap);
}
