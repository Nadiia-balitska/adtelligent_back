"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
async function start() {
    const fastify = await (0, app_1.default)();
    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    const host = process.env.HOST || "0.0.0.0";
    fastify.listen({ port, host }, (err, address) => {
        if (err) {
            console.log(err);
            process.exit(1);
        }
        console.log(`Server running at ${address}`);
    });
}
void start();
