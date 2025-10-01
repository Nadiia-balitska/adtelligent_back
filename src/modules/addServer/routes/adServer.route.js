import { randomUUID } from "node:crypto";
import { getAd } from "../services/adServer.service.js";

async function adServerRoute(fastify) {


  fastify.get("/api/balitska/health", async () => ({ ok: true }));

  fastify.post("/api/balitska/get", async (request, reply) => {
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

   const {
      geo,
      size,
      adType,
      cpm
    } = request.body || {};

   const ad = await getAd(fastify, userId, {
      geo: geo ? String(geo) : undefined,
      size: size ? String(size) : undefined,
      adType: adType ? String(adType) : undefined,
      cpm: typeof cpm === "number" ? cpm : undefined,
    });

    if (!ad) return reply.code(204).send();
    return reply.send(ad);
  });
}

export default adServerRoute;
