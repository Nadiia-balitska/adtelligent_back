import { FromSchema } from "json-schema-to-ts";

export const errorResponseSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
  required: ["message"],
} as const;

export const registerSchema = {
  body: {
    type: "object",
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 6, maxLength: 72 },
      name: { type: "string", minLength: 1, maxLength: 80, nullable: true },
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
    400: errorResponseSchema,
    401: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

export const loginSchema = {
  body: {
    type: "object",
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 6, maxLength: 72 },
    },
    required: ["email", "password"],
    additionalProperties: false,
  },
  response: registerSchema.response,
} as const;

export type AuthBody = FromSchema<typeof registerSchema.body>;
export type AuthReply = FromSchema<typeof registerSchema.response[200]>;
