import { AdType } from "@prisma/client";

export async function createLineItem(fastify, data) {
  const {
    size,             
    minCPM,           
    maxCPM,           
    geo,             
    adType,          
    frequencyCap,     
    creativePath,     
    active           
  } = data;

  const adTypeKey = String(adType || "BANNER").toUpperCase();
  const adTypeEnum = AdType[adTypeKey] ?? AdType.BANNER;

  return fastify.prisma.lineItem.create({
    data: {
      size,
      minCPM,
      maxCPM,
      geo,
      adType: adTypeEnum,
      frequencyCap,
      creativePath,
      active: typeof active === "boolean" ? active : true,
    },
  });
}

export function listLineItems(fastify) {
  return fastify.prisma.lineItem.findMany({
    orderBy: { createdAt: "desc" },
  });
}
