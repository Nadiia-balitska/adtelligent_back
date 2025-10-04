import multipart from "@fastify/multipart";
import { mkdir, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { createLineItem, listLineItems } from "../../modules/addServer/services/lineItem.service.js";

async function lineItemRoute(fastify) {
  await fastify.register(multipart);

  fastify.get("/line-items", async (_req, reply) => {
    const items = await listLineItems(fastify);
    reply.send(items);
  });

  fastify.post("/line-items", async (request, reply) => {
    const file = await request.file(); 
    if (!file) {
      return reply.code(400).send({ message: "Поле файлу 'creative' обов'язкове" });
    }

    const size = String(file.fields.size?.value ?? "").trim(); 
    const minCPM = parseFloat(String(file.fields.minCPM?.value ?? "0"));
    const maxCPM = parseFloat(String(file.fields.maxCPM?.value ?? "0"));
    const geo = String(file.fields.geo?.value ?? "").trim(); 
    const adType = String(file.fields.adType?.value ?? "BANNER").trim();
    const frequencyCap = parseInt(String(file.fields.frequencyCap?.value ?? "1"), 10);

    if (!size || !/^\d+x\d+$/i.test(size)) {
      return reply.code(400).send({ message: "Поле 'size' має бути у форматі WxH, напр. 300x250" });
    }
    if (isNaN(minCPM) || isNaN(maxCPM)) {
      return reply.code(400).send({ message: "minCPM / maxCPM мають бути числами" });
    }

    const dir = join(process.cwd(), "public", "creatives");
    try { await stat(dir); } catch { await mkdir(dir, { recursive: true }); }

    const safeName = String(file.filename || "creative")
      .replace(/\s+/g, "_")
      .replace(/[^\w.\-]/g, "");

    const filename = `${Date.now()}-${safeName}`;
    const filepath = join(dir, filename);

    await new Promise((resolve, reject) => {
      file.file
        .pipe(createWriteStream(filepath))
        .on("finish", resolve)
        .on("error", reject);
    });

    const created = await createLineItem(fastify, {
      size,
      minCPM,
      maxCPM,
      geo,
      adType,
      frequencyCap,
      creativePath: `/creatives/${filename}`,
    
    });

    reply.code(201).send(created);
  });
}

export default lineItemRoute;
