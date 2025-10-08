
import {FromSchema} from "json-schema-to-ts";

export const EnvSchema = {
    type: 'object',
    properties: {
        PORT: {type: 'number', default: 3000},
        HOST: {type: 'string', default: "0.0.0.0"},
        NODE_ENV:{ type: "string"},
        FEED_DEFAULT_URL:{type: 'string',format: "uri", nullable: true},
        ENABLE_FEEDS_CRON :{type: "number"},
        FEEDS_BATCH :{type: "number"},        
        FEEDS_COLLECTION: {type: 'string'},
        FEEDS_LIST: { type: "string"},
        FEEDS_CRON: { type: "string"},

        TZ:{ type: "string" },
        VITE_API_URL: { type: "string", format: "uri", nullable: true },
        JWT_SECRET: { type: "string", minLength: 16 },
        MONGODB_URI: {type: "string", format: "uri" },
        MONGODB_DB: {type: 'string'},
        CLICKHOUSE_URL: { type: "string", format: "uri", nullable: true},
        CLICKHOUSE_USER: { type: "string" },
        CLICKHOUSE_PASSWORD: { type: "string" },
        CLICKHOUSE_DB: { type: "string" },
        CLICKHOUSE_TABLE: { type: "string" },
        CH_BUFFER_MAX: { type: "number", default: 2000 },
        CH_FLUSH_MS: { type: "number", default: 10000 },   
   


    },
    required: ['PORT', 'HOST', "MONGODB_URI", "JWT_SECRET", "NODE_ENV",  "CLICKHOUSE_URL",
    "CLICKHOUSE_USER",
    "CLICKHOUSE_PASSWORD",
    "CLICKHOUSE_DB"],
    additionalProperties: false,
} as const;

export type Config = FromSchema<typeof EnvSchema>;

