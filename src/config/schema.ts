
import {FromSchema} from "json-schema-to-ts";

export const EnvSchema = {
    type: 'object',
    properties: {
        PORT: {type: 'number', default: 3000},
        HOST: {type: 'string', default: "0.0.0.0"},
        FEED_DEFAULT_URL:{type: 'string',format: "uri", nullable: true},
        MONGODB_URI: {type: "string", format: "uri" },
        MONGODB_DB: {type: 'string'},
        FEEDS_COLLECTION: {type: 'string'},
        JWT_SECRET: { type: "string", minLength: 16 },
        FRONTEND_URL: { type: "string", format: "uri", nullable: true },
        FEEDS_LIST: { type: "string"},
        FEEDS_CRON: { type: "string"},
        NODE_ENV:{ type: "string"},



    },
    required: ['PORT', 'HOST', "MONGODB_URI", "JWT_SECRET", "NODE_ENV"],
    additionalProperties: false,
} as const;

export type Config = FromSchema<typeof EnvSchema>;

