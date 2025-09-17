import Fastify  from 'fastify';
import { buildApp } from '../app'; 

const app=Fastify();
app.get('/',async()=>{
  'hello world'
})
app.listen({port:3000},(err,address)=>{
  if(err){
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
})  

async function start() {

const fastify = buildApp();
const port: number =Number(fastify.config.PORT) || 3000;
const host:any = fastify.config.HOST;

fastify.listen({ port, host }, (err: Error | null, address: string) => {    
  if (err) {
    console.error(err);
    process.exit(1);  

  }
  console.log(`Server listening at ${address}`);
});
}

void start();