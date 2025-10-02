export default async function viewsRoute(fastify) {
  function getUserId(req) {
    const u = req.user?.sub || req.user?.id;
    return typeof u === "string" ? u : null;
  }

  fastify.get("/stat/views", {
    preHandler: fastify.authenticate,
    schema: {
      querystring: {
        type: "object",
        properties: {
          page: { type: "integer", minimum: 1, default: 1 },
          page_size: { type: "integer", minimum: 1, maximum: 100, default: 50 },
          search: { type: "string" }
        },
        additionalProperties: false
      }
    }
  }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.code(401).send({ message: "unauthorized" });

    const { page = 1, page_size = 50, search } = req.query;
    const skip = (page - 1) * page_size;

    const where = search
      ? { userId, name: { contains: search, mode: "insensitive" } }
      : { userId };

    const [rows, total] = await Promise.all([
      fastify.prisma.reportView.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: page_size
      }),
      fastify.prisma.reportView.count({ where })
    ]);

    return { page, page_size, total, rows };
  });

  fastify.post("/stat/views", {
    preHandler: fastify.authenticate,
    schema: {
      body: {
        type: "object",
        required: ["name", "config"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 200 },
          config: { type: "object" } 
        },
        additionalProperties: false
      }
    }
  }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.code(401).send({ message: "unauthorized" });

    const { name, config } = req.body;

    try {
      const updated = await fastify.prisma.reportView.update({
        where: { userId_name: { userId, name } }, 
        data: { config }
      });
      return reply.code(200).send(updated);
    } catch (e) {
      const created = await fastify.prisma.reportView.create({
        data: { userId, name, config }
      });
      return reply.code(201).send(created);
    }
  });

  fastify.put("/stat/views/:id", {
    preHandler: fastify.authenticate,
    schema: {
      params: {
        type: "object",
        properties: { id: { type: "string", minLength: 1 } },
        required: ["id"]
      },
      body: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 200 },
          config: { type: "object" }
        },
        additionalProperties: false
      }
    }
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
      data: { ...(name ? { name } : {}), ...(config ? { config } : {}) }
    });

    return reply.send(updated);
  });

  fastify.delete("/stat/views/:id", {
    preHandler: fastify.authenticate,
    schema: {
      params: {
        type: "object",
        properties: { id: { type: "string", minLength: 1 } },
        required: ["id"]
      }
    }
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
}
