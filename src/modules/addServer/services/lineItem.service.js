import { AdType } from "@prisma/client";


export async function createLineItem(fastify, data) {
  const adTypeKey = String(data.adType || "BANNER").toUpperCase();
  const adTypeEnum = AdType[adTypeKey] ?? AdType.BANNER;

  return fastify.prisma.lineItem.create({
    data: {
      size: data.size,
      minCPM: data.minCPM,
      maxCPM: data.maxCPM,
      geo: data.geo,
      adType: adTypeEnum,
      frequencyCap: data.frequencyCap,
      creativePath: data.creativePath,
      active: typeof data.active === "boolean" ? data.active : true,
    },
  });
}

export function listLineItems(fastify) {
  return fastify.prisma.lineItem.findMany({
    orderBy: { createdAt: "desc" },
  });
}
