import buildApp from "./app";

async function start() {
    
    const fastify = await buildApp()

    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    const host = process.env.HOST || "0.0.0.0";

    fastify.listen({port, host}, (err, address) => {
        if(err){
            console.log(err)
            process.exit(1)
        }
        console.log(`Server running at ${address}`)
    })

}

void start()