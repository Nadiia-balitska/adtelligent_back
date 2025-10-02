export default async function viewsRoute(fastify) {
  function getUserId(req) {
    const u = req.user?.id || req.headers["x-user-id"];
    return typeof u === "string" ? u : null;
  }

  fastify.get("/stat/views", async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.code(401).send({ message: "unauthorized" });

    const views = await fastify.prisma.reportView.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return views;
  });

  fastify.post("/stat/views", {
    schema: {
      body: {
        type: "object",
        required: ["name", "config"],
        properties: {
          name: { type: "string", minLength: 1 },
          config: { type: "object" },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const userId = getUserId(req);
    if (!userId) return reply.code(401).send({ message: "unauthorized" });

    const { name, config } = req.body;

    const created = await fastify.prisma.reportView.create({
      data: { userId, name, config },
    });
    reply.code(201).send(created);
  });
}
