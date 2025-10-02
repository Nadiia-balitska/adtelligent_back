import type { FastifyInstance } from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { parseArticle} from "../services/parseArticle.service";
import { getArticleSchema as schema,
 } from "../schemas/getArticle.schema";


export default async function articleRoutes(fastify: FastifyInstance) {
  const r = fastify.withTypeProvider<JsonSchemaToTsProvider>();

  r.get(
    "/api/article",
    {
      schema,
      preValidation: [fastify.authenticate],
    },
    async (req) => {
      const art = await parseArticle(req.query.url);
      return art; 
    }
  );
}


