import type { FromSchema } from "json-schema-to-ts";

export const getArticleSchema = {
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

export type GetArticleQuery = FromSchema<typeof getArticleSchema.querystring>;
export type GetArticleReply = FromSchema<(typeof getArticleSchema)["response"][200]>;
