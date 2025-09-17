import fastifyEnv from "@fastify/env";
import Ajv from "ajv";
import ajvFormats from "ajv-formats";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { EnvSchema } from "./schema";

export default fp(
    async (fastify: FastifyInstance) => {
        try {
            await fastify.register(fastifyEnv, {
                confKey: "config",
                schema: EnvSchema,
                dotenv: true,
                data: process.env as any,
                ajv: {
                    customOptions: () => {
                        const ajv = new Ajv({
                            allErrors: true,
                            removeAdditional: "all",
                            coerceTypes: true,
                            useDefaults: true,
                        });
                        ajvFormats(ajv);
                        return ajv;
                    },
                },
            });

            fastify.log.info("✅ Environment variables loaded successfully");
        } catch (error) {
            fastify.log.error("❌ Error in config plugin:", error);
            throw error;
        }
    },
    {
        name: "config-plugin",
    },
);
