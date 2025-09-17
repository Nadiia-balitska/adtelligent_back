"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const config_1 = __importDefault(require("./config"));
const autoload_1 = __importDefault(require("@fastify/autoload"));
const path_1 = require("path");
function buildApp(options = {}) {
    const fastify = (0, fastify_1.default)();
    try {
        fastify.decorate("pluginLoaded", (pluginName) => {
            fastify.log.info(`✅ Plugin loaded: ${pluginName}`);
        });
        fastify.log.info("Starting to load plugins");
        await fastify.register(autoload_1.default, {
            dir: (0, path_1.join)(__dirname, "plugins"),
            options: options,
            ignorePattern: /^((?!plugin).)*$/,
        });
        fastify.log.info("✅ Plugins loaded successfully");
    }
    catch (error) {
        fastify.log.error("Error in autoload:", error);
        throw error;
    }
    fastify.register(config_1.default);
    fastify.get('/', async (request, reply) => {
        return { hello: 'world' };
    });
    return fastify;
}
exports.default = buildApp;
