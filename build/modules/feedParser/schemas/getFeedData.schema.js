"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = void 0;
exports.schema = {
    tags: ['feed'],
    summary: 'Get feed data',
    description: 'Get feed data',
    response: {
        200: {
            type: 'object',
            properties: {
                hello: {
                    type: 'string',
                }
            }
        }
    }
};
