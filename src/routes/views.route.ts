import type { FastifyPluginAsync } from "fastify";
import {
  ViewsListQuery,
  ViewsListReply,
  ViewsCreateBody,
  ViewsUpdateBody,
  ViewsIdParams,
  ReportView,
} from "../types/views";
import { Prisma } from "@prisma/client";

const viewsRoute: FastifyPluginAsync = async (fastify) => {
  const getUserId = (req: any): string | null => {
    const u = req.user?.sub || req.user?.id;
    return typeof u === "string" ? u : null;
  };

  fastify.get<{
    Querystring: ViewsListQuery;
    Reply: ViewsListReply | { message: string };
  }>("/stat/views", {
    preHandler: fastify.authenticate,
    schema: {
      querystring: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1, default: 1 },
          page_size: { type: "integer", minimum: 1, maximum: 100, default: 50 },
          search: { type: "string" },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.code(401).send({ message: "unauthorized" });

    const { page = 1, page_size = 50, search } = req.query;
    const skip = (page - 1) * page_size;

    const where = search
      ? { userId, name: { contains: search, mode: Prisma.QueryMode.insensitive } }
      : { userId };

    const [rows, total] = await Promise.all([
      fastify.prisma.reportView.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: page_size,
      }),
      fastify.prisma.reportView.count({ where }),
    ]);

    const safeRows = rows.map(row => ({
      ...row,
      config:
        row.config &&
        typeof row.config === "object" &&
        !Array.isArray(row.config)
          ? row.config
          : {},
    }));
    return reply.send({ page, page_size, total, rows: safeRows });
  });

  fastify.post<{
    Body: ViewsCreateBody;
    Reply: ReportView | { message: string };
  }>("/stat/views", {
    preHandler: fastify.authenticate,
    schema: {
      body: {
        type: "object",
        required: ["name", "config"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 200 },
          config: { type: "object" },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.code(401).send({ message: "unauthorized" });

    const { name, config } = req.body;

    try {
      const updated = await fastify.prisma.reportView.update({
        where: { userId_name: { userId, name } },
        data: { config: config as Prisma.JsonObject },
      });
      const safeConfig =
        updated.config &&
        typeof updated.config === "object" &&
        !Array.isArray(updated.config)
          ? updated.config
          : {};
      return reply.code(200).send({ ...updated, config: safeConfig });
    } catch {
      const created = await fastify.prisma.reportView.create({
        data: { userId, name, config: config as Prisma.JsonObject },
      });
      const safeConfig =
        created.config &&
        typeof created.config === "object" &&
        !Array.isArray(created.config)
          ? created.config
          : {};
      return reply.code(201).send({ ...created, config: safeConfig });
    }
  });

  fastify.put<{
    Params: ViewsIdParams;
    Body: ViewsUpdateBody;
    Reply: ReportView | { message: string };
  }>("/stat/views/:id", {
    preHandler: fastify.authenticate,
    schema: {
      params: {
        type: "object",
        properties: { id: { type: "string", minLength: 1 } },
        required: ["id"],
      },
      body: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 200 },
          config: { type: "object" },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.code(401).send({ message: "unauthorized" });

    const { id } = req.params;
    const { name, config } = req.body;

    const existing = await fastify.prisma.reportView.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return reply.code(404).send({ message: "not found" });
    }

    if (name && name !== existing.name) {
      const clash = await fastify.prisma.reportView.findFirst({ where: { userId, name } });
      if (clash) return reply.code(409).send({ message: "name already exists" });
    }

    const updated = await fastify.prisma.reportView.update({
      where: { id },
      data: { ...(name ? { name } : {}), ...(config ? { config: config as Prisma.JsonObject } : {}) },
    });

    const safeConfig =
      updated.config &&
      typeof updated.config === "object" &&
      !Array.isArray(updated.config)
        ? updated.config
        : {};

    return reply.send({ ...updated, config: safeConfig });
  });

  fastify.delete<{
    Params: ViewsIdParams;
  }>("/stat/views/:id", {
    preHandler: fastify.authenticate,
    schema: {
      params: {
        type: "object",
        properties: { id: { type: "string", minLength: 1 } },
        required: ["id"],
      },
    },
  }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.code(401).send({ message: "unauthorized" });

    const { id } = req.params;
    const existing = await fastify.prisma.reportView.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return reply.code(404).send({ message: "not found" });
    }

    await fastify.prisma.reportView.delete({ where: { id } });
    return reply.code(204).send();
  });
};

export default viewsRoute;
