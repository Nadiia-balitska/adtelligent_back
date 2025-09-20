"use strict";
//тут  в мене GET /api/feed (ендпоінт для отримання фіда)
Object.defineProperty(exports, "__esModule", { value: true });
const feedParser_route_1 = require("../modules/feedParser/routes/feedParser.route");
const routes = async (app) => {
    await app.register(feedParser_route_1.getFeedDataRoutes, { prefix: "/api" });
};
exports.default = routes;
