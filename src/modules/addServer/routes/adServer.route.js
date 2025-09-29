import { randomUUID } from "node:crypto";
import { getAd } from "../services/adServer.service.js";

async function adServerRoute(fastify) {
  fastify.get("/api/adserver/health", async () => ({ ok: true }));

  fastify.post("/api/adserver/get", async (request, reply) => {
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

    const body = (request.body || {});
    const ad = await getAd(fastify, userId, {
      geo: body.geo ? String(body.geo) : undefined,
      size: body.size ? String(body.size) : undefined,
      adType: body.adType ? String(body.adType) : undefined,
      cpm: typeof body.cpm === "number" ? body.cpm : undefined,
    });

    if (!ad) return reply.code(204).send();
    return reply.send(ad);
  });
}

export default adServerRoute;
