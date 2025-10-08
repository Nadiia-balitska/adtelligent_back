import {diag, DiagConsoleLogger, DiagLogLevel }from "@opentelemetry/api"
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { FastifyOtelInstrumentation } from '@opentelemetry/instrumentation-fastify';
export async function initOpenTelemetry() {
	diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
	

	const sdk = new NodeSDK({
		instrumentations: [
			new PinoInstrumentation({
				enabled: true,
				logHook: (_span, record) => {
					record["resource.service.name"] = "";
					record["resource.service.version"] = "";
				},
			}),
			new FastifyOtelInstrumentation({
				servername: "",
				registerOnInitialization: true,
				ignorePaths: (opts) => {
					return opts.url.startsWith("/health");
				},
			}),
			new MongoDBInstrumentation({ enhancedDatabaseReporting: true }),
			new FsInstrumentation(),
		],
		serviceName: 
	});

	try {
		await sdk.start();
		console.log("✅ OTEL SDK started");
	} catch (err) {
		console.error("❌ OTEL SDK failed to start:", err);
		
	}
//DODATU TRANSPORTI
	return sdk;
}