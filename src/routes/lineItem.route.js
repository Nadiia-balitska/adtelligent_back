import multipart from "@fastify/multipart";
import { mkdir, stat, unlink } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { join, extname } from "node:path";
import { createLineItem, listLineItems } from "../modules/addServer/services/lineItem.service.js";

async function lineItemRoute(fastify) {
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, 
      files: 1,
    },
  });

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
    const geo = String(file.fields.geo?.value ?? "").trim().toUpperCase();
    const adType = String(file.fields.adType?.value ?? "BANNER").trim();
    const frequencyCap = parseInt(String(file.fields.frequencyCap?.value ?? "1"), 10);

    if (!size || !/^\d+x\d+$/i.test(size)) {
      return reply.code(400).send({ message: "Поле 'size' має бути у форматі WxH, напр. 300x250" });
    }
    if ([minCPM, maxCPM].some(Number.isNaN) || minCPM < 0 || maxCPM < 0) {
      return reply.code(400).send({ message: "minCPM / maxCPM мають бути невід’ємними числами" });
    }
    if (minCPM > maxCPM) {
      return reply.code(400).send({ message: "minCPM не може бути більшим за maxCPM" });
    }
    if (Number.isNaN(frequencyCap) || frequencyCap < 1) {
      return reply.code(400).send({ message: "frequencyCap має бути цілим числом ≥ 1" });
    }

    const allowedExt = new Set([".jpg", ".jpeg", ".png", ".gif", ".html", ".htm"]);
    const ext = extname(file.filename || "").toLowerCase();
    const allowedMime = new Set([
      "image/jpeg",
      "image/png",
      "image/gif",
      "text/html",
      "application/xhtml+xml",
    ]);
    if (!allowedExt.has(ext) || !allowedMime.has(file.mimetype)) {
      return reply.code(400).send({ message: "Непідтримуваний тип файлу" });
    }

    // збереження файлу
    const dir = join(process.cwd(), "public", "creatives");
    try { await stat(dir); } catch { await mkdir(dir, { recursive: true }); }
    const safeName = String(file.filename || "creative")
      .replace(/\s+/g, "_")
      .replace(/[^\w.\-]/g, "");
    const filename = `${Date.now()}-${safeName}`;
    const filepath = join(dir, filename);

    try {
      await new Promise((resolve, reject) => {
        file.file
          .pipe(createWriteStream(filepath))
          .on("finish", resolve)
          .on("error", reject);
      });

      //  Збереження в БД
      const created = await createLineItem(fastify, {
        size,
        minCPM,
        maxCPM,
        geo,
        adType,
        frequencyCap,
        creativePath: `/creatives/${filename}`,
      });

      return reply.code(201).send(created);
    } catch (e) {
      try { await unlink(filepath); } catch {}
      request.log.error(e, "Create line item failed");
      return reply.code(500).send({ message: "Внутрішня помилка під час створення line item" });
    }
  });
}

export default lineItemRoute;
