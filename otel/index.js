import FastifyOtelInstrumentation from "@fastify/otel";


// npm install @opentelemetry/api@^1.9.0 \

// @opentelemetry/exporter-logs-otlp-http@^0.203.0 \

// @opentelemetry/exporter-metrics-otlp-http@^0.203.0 \

// @opentelemetry/exporter-trace-otlp-http@^0.203.0 \

// @opentelemetry/instrumentation-fs@^0.23.0 \

// @opentelemetry/instrumentation-ioredis@^0.51.0 \

// @opentelemetry/instrumentation-mongodb@^0.56.0 \

// @opentelemetry/instrumentation-pino@^0.50.0 \

// @opentelemetry/resources@^2.0.1 \

// @opentelemetry/sdk-logs@^0.203.0 \

// @opentelemetry/sdk-metrics@^2.0.1 \

// @opentelemetry/sdk-node@^0.203.0 \

// @opentelemetry/sdk-trace-node@^2.0.1 \

// @opentelemetry/semantic-conventions@^1.36.0
 
// npm install @fastify/otel@^0.9.3

export async function initOpenTelemetry() {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);


const sdk = new NodeSDK({
    traceExporter: new ConsoleSpanExporter(),
    matriccExporter: new ConsoleMetricExporter(),
    logRecordExporter:[
        new SimpleLogRecordProcessor(
            new ConsolLogRecordExporter()
        ),

    ],
    instrumentation:[
        new FastifyOtelInstrumentation({
            servername: 'fastify-form-app',
            registerOnInitialization: true,
            ignorePaths: (opts)=>{
                return opts.url.includes('/health')
            }
        }),
        new FsInstrumentation(),
        new MongoDBInstrumentation({enhanceDatabaseReporting: true})
    ],
    serviceNAme:'fastify-form-app',
    resources:{
        "service.naem": "fastify-form-app",
        "service.version": "1.0.0",
        "service.enviroment": "development",
        "service.instance.id":
    }
});
}