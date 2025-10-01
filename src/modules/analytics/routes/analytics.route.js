import { DateTime } from "luxon";

export default async function analyticsRoute(fastify) {
  fastify.get("/stat", async () => {
    const rows = await fastify.prisma.analytics.findMany({
      orderBy: { timestamp: "desc" },
      take: 100,
    });
    return rows;
  });

  const cache = new Set();
  let timer = Date.now();

  fastify.post("/stat/events", async (request, reply) => {
    const {
      event,
      page,
      userAgent,
      auctionId,
      adUnitCode,
      bidder,
      cpm,
      creativeId,
      size,
      currency,
      geo,
      userId,
      timestamp,
    } = request.body;

    cache.add({
      event,
      page,
      userAgent,
      auctionId,
      adUnitCode,
      bidder,
      cpm,
      creativeId,
      size,
      currency,
      geo,
      userId,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    });

    if (cache.size >= 2000 || Date.now() - timer > 10000) {
      const values = Array.from(cache);

      await fastify.prisma.analytics.createMany({
        data: values,
        skipDuplicates: true,
      });

      cache.clear();
      timer = Date.now();
    }

    reply.send({ status: "event received" });
  });
}
