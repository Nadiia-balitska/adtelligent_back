import fp from "fastify-plugin";
import sensible from "@fastify/sensible";

const pluginName = "sensible-plugin";

export default fp(
    async (fastify) => {
        fastify.register(sensible);

        fastify.pluginLoaded(pluginName);
    },
    {
        name:pluginName,
    },
)