"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const node_path_1 = require("node:path");
const autoload_1 = __importDefault(require("@fastify/autoload"));
const config_1 = __importDefault(require("./config"));
async function buildApp(options = {}) {
    const isProd = process.env.NODE_ENV === "production";
    const fastify = (0, fastify_1.default)({ logger: isProd
            ? true
            : {
                transport: {
                    target: "pino-pretty",
                    options: { colorize: true, singleLine: true, translateTime: "HH:MM:ss" },
                },
            },
        trustProxy: true });
    await fastify.register(config_1.default);
    try {
        fastify.decorate("pluginLoaded", (pluginName) => {
            fastify.log.info(`✅ Plugin loaded: ${pluginName}`);
        });
        fastify.log.info("Starting to load plugins");
        await fastify.register(autoload_1.default, {
            dir: (0, node_path_1.join)(__dirname, "plugins"),
            options: options,
            ignorePattern: /^((?!plugin).)*$/,
        });
        fastify.log.info("✅ Plugins loaded successfully");
    }
    catch (error) {
        fastify.log.error("Error in autoload:", error);
        throw error;
    }
    await fastify.register(autoload_1.default, {
        dir: (0, node_path_1.join)(__dirname, "routes"),
        options,
        dirNameRoutePrefix: false,
    });
    fastify.get("/", async (request, reply) => {
        return { hello: "world" };
    });
    // fastify.register(getFeedDataRoutes) // я винесла в інший файл routes/feed.ts
    fastify.get("/health/server", async () => ({ status: "ok" }));
    fastify.get("/health/db", async (req, reply) => {
        try {
            if (fastify.prisma?.$queryRaw) {
                await fastify.prisma.$queryRaw `SELECT 1`;
                await fastify.mongo.client.db().command({ ping: 1 });
                return { status: "ok" };
            }
            return { status: "unknown" };
        }
        catch (err) {
            fastify.log.error({ err }, "DB health failed");
            reply.code(500);
            return { status: "down" };
        }
    });
    fastify.setErrorHandler((err, _req, reply) => {
        fastify.log.error({ err }, "Unhandled error");
        reply.code(err.statusCode ?? 500).send({ message: "Internal Server Error" });
    });
    return fastify;
}
exports.default = buildApp;
