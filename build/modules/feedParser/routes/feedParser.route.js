"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeedDataRoutes = getFeedDataRoutes;
const getFeedData_schema_1 = require("../schemas/getFeedData.schema");
async function getFeedDataRoutes(fastify) {
    const route = fastify.withTypeProvider();
    route.get('/feed', {
        schema: getFeedData_schema_1.schema,
    }, async (request, reply) => {
        reply.send({ hello: "feed" });
    });
}
