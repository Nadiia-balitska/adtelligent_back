"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const app_1 = require("../app");
const app = (0, fastify_1.default)();
app.get('/', async () => {
    'hello world';
});
app.listen({ port: 3000 }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server listening at ${address}`);
});
async function start() {
    const fastify = (0, app_1.buildApp)();
    const port = Number(fastify.config.PORT) || 3000;
    const host = fastify.config.HOST;
    fastify.listen({ port, host }, (err, address) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Server listening at ${address}`);
    });
}
void start();
