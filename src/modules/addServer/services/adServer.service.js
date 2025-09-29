export async function getAd(fastify, userId, filters = {}) {
  let items = await fastify.prisma.lineItem.findMany({ where: { active: true } });

  const { geo, size, adType, cpm } = filters;

  if (geo) {
    const G = String(geo).toUpperCase();
    items = items.filter((i) =>
      String(i.geo || "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
        .includes(G)
    );
  }

  if (size) items = items.filter((i) => i.size === String(size));

  if (adType) {
    const A = String(adType).toUpperCase();
    items = items.filter((i) => String(i.adType).toUpperCase() === A);
  }

  if (typeof cpm === "number") {
    items = items.filter((i) => cpm >= i.minCPM && cpm <= i.maxCPM);
  }

  if (items.length === 0) return null;

  const counters = await fastify.prisma.impressionCounter.findMany({
    where: { userId, lineItemId: { in: items.map((i) => i.id) } },
  });
  const seen = new Map(counters.map((c) => [c.lineItemId, c.count]));
  items = items.filter((i) => (seen.get(i.id) ?? 0) < i.frequencyCap);

  if (items.length === 0) return null;

  items.sort((a, b) => b.minCPM - a.minCPM);
  const winner = items[0];

  await fastify.prisma.impression.create({
    data: { userId, lineItemId: winner.id },
  });

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
