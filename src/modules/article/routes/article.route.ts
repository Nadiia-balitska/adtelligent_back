import type { FastifyInstance } from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { parseArticle, type Article } from "../services/parseArticle.service";

const schema = {
  querystring: {
    type: "object",
    properties: {
      url: { type: "string", format: "uri" },
    },
    required: ["url"],
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: {
        url: { type: "string" },
        title: { type: "string", nullable: true },
        content: { type: "string", nullable: true },
        publishedAt: { type: "string", format: "date-time", nullable: true },
      },
      required: ["url"],
      additionalProperties: false,
    },
  },
} as const;

export default async function articleRoutes(fastify: FastifyInstance) {
  const r = fastify.withTypeProvider<JsonSchemaToTsProvider>();

  r.get<{ Querystring: { url: string }; Reply: Article }>(
    "/api/article",
    { schema },
    async (req) => {
      const art = await parseArticle(req.query.url);
      fastify.log.info({ url: art.url }, "Parsed article");
      return art;
    }
  );
}
