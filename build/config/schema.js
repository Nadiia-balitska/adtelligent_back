"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvSchema = void 0;
exports.EnvSchema = {
    type: 'object',
    properties: {
        PORT: { type: 'number' },
        HOST: { type: 'string' },
        FEED_DEFAULT_URL: { type: 'string', nullable: true },
        MONGODB_URI: { type: 'string' },
        MONGODB_DB: { type: 'string' },
        FEEDS_COLLECTION: { type: 'string' },
    },
    required: ['PORT', 'HOST'],
    additionalProperties: false,
};
