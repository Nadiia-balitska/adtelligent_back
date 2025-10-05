import type { FastifyInstance } from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { parseArticle} from "../modules/article/services/parseArticle.service";
import { getArticleSchema as schema,
 } from "../modules/article/schemas/getArticle.schema";


export default async function articleRoutes(fastify: FastifyInstance) {
  const r = fastify.withTypeProvider<JsonSchemaToTsProvider>();

  r.get(
    "/article",
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


