import { FromSchema } from "json-schema-to-ts";

export const EnvSchema = {
    type: 'object',
    properties: {
        PORT: {type: 'number'},
        HOST: {type: 'string'},
    },
    required: ['PORT', 'HOST'],
    additionalProperties: false,
} as const;

export type Config = FromSchema<typeof EnvSchema>;