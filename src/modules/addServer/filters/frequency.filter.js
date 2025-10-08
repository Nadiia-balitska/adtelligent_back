export async function frequencyFilter(lineItems, context) {
  const { fastify, userId } = context;
  if (!lineItems.length) return lineItems;

  const counters = await fastify.prisma.impressionCounter.findMany({
    where: { userId, lineItemId: { in: lineItems.map(item => item.id) } },
  });

  const seen = new Map(counters.map(counter => [counter.lineItemId, counter.count]));

  return lineItems.filter(lineItem => (seen.get(lineItem.id) ?? 0) < lineItem.frequencyCap);
}
