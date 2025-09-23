import { FromSchema } from "json-schema-to-ts";

export const registerSchema = {
  body: {
    type: "object",
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 6, maxLength: 72 },
    },
    required: ["email", "password"],
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: { token: { type: "string" } },
      required: ["token"],
    },
  },
} as const;

export const loginSchema = registerSchema;

export type AuthBody = FromSchema<typeof registerSchema.body>;
export type AuthReply = FromSchema<typeof registerSchema.response[200]>;
