"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvSchema = void 0;
exports.EnvSchema = {
    type: 'object',
    properties: {
        PORT: { type: 'number' },
        HOST: { type: 'string' },
        FEED_DEFAULT_URL: { type: 'string', nullable: true },
    },
    required: ['PORT', 'HOST'],
    additionalProperties: false,
};
