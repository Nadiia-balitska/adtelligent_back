// import { randomUUID } from "node:crypto";
// import { getAd } from "../modules/addServer/services/adServer.service";

// async function adServerRoute(fastify) {


//   fastify.get("/balitska/health", async () => ({ ok: true }));

//   fastify.post("/balitska/get", async (request, reply) => {
//     let userId = request.cookies?.ad_uid;
//     if (!userId) {
//       userId = randomUUID();
//       reply.setCookie("ad_uid", userId, {
//         path: "/",
//         sameSite: "lax",
//         httpOnly: false,
//         maxAge: 60 * 60 * 24 * 180,
//       });
//     }

//    const {
//       geo,
//       size,
//       adType,
//       cpm,
//       adId,
//       nanoid = randomUUID(),
//     } = request.body || {};

//    const ad = await getAd(fastify, userId, {
//     adId: adId ? String(nanoid) : undefined,
//       geo: geo ? String(geo) : undefined,
//       size: size ? String(size) : undefined,
//       adType: adType ? String(adType) : undefined,
//       cpm: typeof cpm === "number" ? cpm : undefined,
//     });

//     if (!ad) return reply.code(204).send();
//     return reply.send(ad);
//   });
// }

// export default adServerRoute;
// import { randomUUID } from "node:crypto";
// import { getAd } from "../modules/addServer/services/adServer.service.js";

// async function adServerRoute(fastify) {
//   fastify.get("/balitska/health", async () => ({ ok: true }));

//   fastify.post("/balitska/get", async (request, reply) => {
//     let userId = request.cookies?.ad_uid;
//     if (!userId) {
//       userId = randomUUID();
//       reply.setCookie("ad_uid", userId, {
//         path: "/",
//         sameSite: "lax",
//         httpOnly: false,
//         maxAge: 60 * 60 * 24 * 180,
//       });
//     }

//     const body = request.body || {};

//     if (Array.isArray(body.imp)) {
//       const bids = [];

//       for (const imp of body.imp) {
//         const fmt = Array.isArray(imp?.banner?.format) && imp.banner.format.length
//           ? imp.banner.format[0]
//           : (imp?.banner?.w && imp?.banner?.h ? { w: imp.banner.w, h: imp.banner.h } : null);

//         const size = fmt ? `${fmt.w}x${fmt.h}` : undefined;

//         const adType = "BANNER";

//         const cpm = typeof imp?.bidfloor === "number" ? imp.bidfloor : undefined;

//         const ad = await getAd(fastify, userId, {
//           size,
//           adType,
//           geo: body?.device?.geo?.country || body?.geo || undefined,
//           cpm,
//         });

//         if (ad) {
//           bids.push({
//             impid: String(imp.id || imp.tagid || randomUUID()),
//             price: Number(ad.price || ad.minCPM || 0),
//             adm: ad.adm,           
//             crid: ad.crid || `creative-${ad.id}`,
//             w: ad.w,
//             h: ad.h,
//             adomain: Array.isArray(ad.adomain) ? ad.adomain : ["example.com"],
//           });
//         }
//       }

//       if (bids.length === 0) return reply.code(204).send();

//       const ortbResponse = {
//         id: String(body.id || randomUUID()),
//         seatbid: [{ bid: bids }],
//         cur: "USD",
//       };
//       return reply.send(ortbResponse);
//     }

//     const {
//       geo,
//       size,
//       adType,
//       cpm,
//     } = body;

//     const ad = await getAd(fastify, userId, {
//       geo: geo ? String(geo) : undefined,
//       size: size ? String(size) : undefined,
//       adType: adType ? String(adType) : undefined,
//       cpm: typeof cpm === "number" ? cpm : undefined,
//     });

//     if (!ad) return reply.code(204).send();
//     return reply.send(ad);
//   });
// }

// export default adServerRoute;


import { randomUUID } from "node:crypto";
import { getAd } from "../modules/addServer/services/adServer.service.js";

async function adServerRoute(fastify) {
  fastify.get("/balitska/health", async () => ({ ok: true }));

  fastify.post("/balitska/get", async (request, reply) => {
    let userId = request.cookies?.ad_uid;
    if (!userId) {
      userId = randomUUID();
      reply.setCookie("ad_uid", userId, {
        path: "/",
        sameSite: "lax",
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 180,
      });
    }

    const body = request.body || {};

    if (Array.isArray(body.imp)) {
      const bids = [];

      for (const imp of body.imp) {
        const fmt = Array.isArray(imp?.banner?.format) && imp.banner.format.length
          ? imp.banner.format[0]
          : (imp?.banner?.w && imp?.banner?.h ? { w: imp.banner.w, h: imp.banner.h } : null);

        const size = fmt ? `${fmt.w}x${fmt.h}` : undefined;
        const adType = "BANNER";
        const cpm = typeof imp?.bidfloor === "number" ? imp.bidfloor : undefined;

        const ad = await getAd(fastify, userId, {
          size,
          adType,
          geo: body?.device?.geo?.country || body?.geo || undefined,
          cpm,
        });

        if (ad) {
          bids.push({
            impid: String(imp.id || imp.tagid || randomUUID()),
            price: Number(ad.price || 0),
            adm: ad.adm,
            crid: ad.crid || `creative-${ad.id}`,
            adid: String(ad.id),            
            w: ad.w,
            h: ad.h,
            adomain: Array.isArray(ad.adomain) ? ad.adomain : ["example.com"],
          });
        }
      }

      if (bids.length === 0) return reply.code(204).send();

      return reply.send({
        id: String(body.id || randomUUID()),
        seatbid: [{ bid: bids }],
        cur: "USD",
      });
    }

    const geo = body.geo ? String(body.geo) : undefined;
    const size = body.size ? String(body.size) : undefined;
    const adType = body.adType ? String(body.adType) : undefined;
    const cpm = typeof body.cpm === "number" ? body.cpm : undefined;

    const ad = await getAd(fastify, userId, { geo, size, adType, cpm });
    if (!ad) return reply.code(204).send();
    return reply.send(ad);
  });
}

export default adServerRoute;
