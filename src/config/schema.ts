import {FromSchema} from "json-schema-to-ts";

export const EnvSchema = {
    type: 'object',
    properties: {
        PORT: {type: 'number'},
        HOST: {type: 'string'},
        FEED_DEFAULT_URL:{type: 'string',format: "uri", nullable: true},
        MONGODB_URI: {type: "string", format: "uri" },
        MONGODB_DB: {type: 'string'},
        FEEDS_COLLECTION: {type: 'string'},
        JWT_SECRET: { type: "string", minLength: 16 },
    },
    required: ['PORT', 'HOST', "MONGODB_URI", "JWT_SECRET"],
    additionalProperties: false,
} as const;

export type Config = FromSchema<typeof EnvSchema>;