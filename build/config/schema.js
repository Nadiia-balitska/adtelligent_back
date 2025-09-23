"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvSchema = void 0;
exports.EnvSchema = {
    type: 'object',
    properties: {
        PORT: { type: 'number' },
        HOST: { type: 'string' },
        FEED_DEFAULT_URL: { type: 'string', format: "uri", nullable: true },
        MONGODB_URI: { type: "string", format: "uri" },
        MONGODB_DB: { type: 'string' },
        FEEDS_COLLECTION: { type: 'string' },
        JWT_SECRET: { type: "string", minLength: 16 },
    },
    required: ['PORT', 'HOST', "MONGODB_URI", "JWT_SECRET"],
    additionalProperties: false,
};
