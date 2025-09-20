import buildApp from "./app";

async function start() {
  const isProd = process.env.NODE_ENV === "production";
    
    const fastify = await buildApp({logger: isProd
      ? true
      : {
          transport: {
            target: "pino-pretty",
            options: { colorize: true, singleLine: true, translateTime: "HH:MM:ss" },
          },
        },
    trustProxy: true})

    const port = fastify.config.PORT
    const host = fastify.config.HOST

    fastify.listen({port, host}, (err, address) => {
        if(err){
            console.log(err)
            process.exit(1)
        }
        console.log(`Server running at ${address}`)
    })

}

void start()