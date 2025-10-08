import { runFilters } from "../filters/index.js";

export async function getAd(fastify, userId, filters = {}) {
  let items = await fastify.prisma.lineItem.findMany({
    where: { active: true },
  });

  items = await runFilters(items, { ...filters, fastify, userId });
  if (!items.length) return null;

  items.sort((a, b) => b.minCPM - a.minCPM);
  const winner = items[0];

  await fastify.prisma.impression.create({
    data: { userId, lineItemId: winner.id },
  });

  const where = { userId_lineItemId: { userId, lineItemId: winner.id } };
  const res = await fastify.prisma.impressionCounter.upsert({
    where,
    update: { count: { increment: 1 } },
    create: { userId, lineItemId: winner.id, count: 1 },
  });
const isImage = /\.(png|jpe?g|gif|webp)$/i.test(creativePath);
  const [w, h] = winner.size.split("x").map(Number);


const creativeUrl = `https://adtelligentback-production.up.railway.app${winner.creativePath}`;
  
const adm = isImage
  ? `<img src="${creativeUrl}" width="${w}" height="${h}" style="display:block;border:0;max-width:100%;height:auto"/>`
  : `<iframe src="${creativeUrl}" width="${w}" height="${h}" frameborder="0" scrolling="no"></iframe>`;

  return {
    id: winner.id,                         
    crid: `creative-${winner.id}`,         
    adm,                                   
    w,                                    
    h,                                     
    price: winner.minCPM,                 
    adomain: ["adtelligent.com"],            
    adType: winner.adType,                 
    geo: winner.geo,                      
  };
}
