"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvSchema = void 0;
exports.EnvSchema = {
    type: 'object',
    properties: {
        PORT: { type: 'number' },
        HOST: { type: 'string' },
    },
    required: ['PORT', 'HOST'],
    additionalProperties: false,
};
