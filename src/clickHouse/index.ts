// import fp from 'fastify-plugin';
// import { FastifyInstance } from 'fastify';
// import { createClient } from '@clickhouse/client';

// export default fp(async (fastify: FastifyInstance) => {
//     // @ts-ignore
//     const client = new createClient({
//         host:'http://localhost:8123/'
//     });
//     fastify.decorate('clickHouse', client);
//     // fastify.pluginLoaded('clickHouse-plugin');

//     fastify.addHook('onClose', async () => {
//         await client.close();
//     });
// });