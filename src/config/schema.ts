import {FromSchema} from "json-schema-to-ts";

export const EnvSchema = {
    type: 'object',
    properties: {
        PORT: {type: 'number'},
        HOST: {type: 'string'},
        FEED_DEFAULT_URL:{type: 'string', nullable: true},
        MONGODB_URI: {type: 'string'},
        MONGODB_DB: {type: 'string'},
        FEEDS_COLLECTION: {type: 'string'},
    },
    required: ['PORT', 'HOST'],
    additionalProperties: false,
} as const;

export type Config = FromSchema<typeof EnvSchema>;