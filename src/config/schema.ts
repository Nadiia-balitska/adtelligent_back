
import {FromSchema} from "json-schema-to-ts";

export const EnvSchema = {
    type: 'object',
    properties: {
        PORT: {type: 'number'},
        HOST: {type: 'string'},
        FEED_DEFAULT_URL:{type: 'string',format: "uri", nullable: true},
        DATABASE_URL: {type: "string", format: "uri" },
        FEEDS_COLLECTION: {type: 'string'},
        JWT_SECRET: { type: "string", minLength: 16 },
        FRONTEND_URL: { type: "string", format: "uri", nullable: true },
        FEEDS_LIST: { type: "string"},
        FEEDS_CRON: { type: "string"},



    },
    required: ['PORT', 'HOST', "DATABASE_URL", "JWT_SECRET"],
    additionalProperties: false,
} as const;

export type Config = FromSchema<typeof EnvSchema>;

