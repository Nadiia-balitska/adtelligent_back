"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = void 0;
exports.schema = {
    tags: ["feed"],
    summary: "Get feed data",
    description: "Get feed data",
    querystring: {
        type: "object",
        properties: {
            url: { type: "string", format: "uri", nullable: true },
            force: { type: "integer", enum: [0, 1], default: 0 },
        },
        additionalProperties: false,
    },
    response: {
        200: {
            type: "object",
            properties: {
                url: { type: "string" },
                title: { type: "string", nullable: true },
                fetchedAt: { type: "string", format: "date-time" },
                items: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            title: { type: "string" },
                            link: { type: "string" },
                            content: { type: "string", nullable: true },
                            pubDate: { type: "string", nullable: true, format: "date-time" },
                        },
                        required: ["id", "title", "link"],
                        additionalProperties: false,
                    },
                },
            },
            required: ["url", "fetchedAt", "items"],
            additionalProperties: false,
        },
    },
};
