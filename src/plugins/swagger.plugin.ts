import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

export default fp(async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "My APIs",
        description: "Документація для API мого проекту",
        version: "1.0.0",
      },
      servers: [
        {
          url: "http://localhost:3000", 
          description: "Local dev server",
        },
        {
          url: "https://adtelligentback-production.up.railway.app",
          description: "Production server",
        },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
  });
});
