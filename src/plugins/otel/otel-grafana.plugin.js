// import fp from 'fastify-plugin'
// import fastifyOtel from '@fastify/otel'
// import 'dotenv/config'
// import { diag, DiagConsoleLogger, DiagLogLevel, metrics } from '@opentelemetry/api'
// import { NodeSDK } from '@opentelemetry/sdk-node'
// import { Resource } from '@opentelemetry/resources'
// import {
//   ATTR_SERVICE_NAME,
//   ATTR_SERVICE_VERSION,
//   ATTR_DEPLOYMENT_ENVIRONMENT
// } from '@opentelemetry/semantic-conventions'
// import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
// import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
// import { MeterProvider } from '@opentelemetry/sdk-metrics'
// import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
// import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
// import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
// import { FsInstrumentation } from '@opentelemetry/instrumentation-fs'
// import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb'
// import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino'

// export default fp(async function otelGrafanaPlugin(fastify) {
//   diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO)

//   const resource = new Resource({
//     [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'fastify-form-app',
//     [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || '1.0.0',
//     [ATTR_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
//   })

//   const prometheusExporter = new PrometheusExporter({
//     port: Number(process.env.PROM_PORT || 9464),
//     endpoint: process.env.PROM_ENDPOINT || '/metrics'
//   })

//   const meterProvider = new MeterProvider({ resource })
//   meterProvider.addMetricReader(prometheusExporter)
//   metrics.setGlobalMeterProvider(meterProvider)

//   const traceExporter = new OTLPTraceExporter({
//     url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
//     headers: process.env.OTEL_EXPORTER_OTLP_HEADERS
//       ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
//       : {}
//   })

//   const logExporter = new OTLPLogExporter({
//     url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
//     headers: process.env.OTEL_EXPORTER_OTLP_HEADERS
//       ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
//       : {}
//   })

//   const loggerProvider = new LoggerProvider({ resource })
//   loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter))

//   const sdk = new NodeSDK({
//     resource,
//     metricReader: undefined,
//     spanProcessor: new BatchSpanProcessor(traceExporter),
//     logRecordProcessor: new BatchLogRecordProcessor(logExporter),
//     instrumentations: [
//       new FsInstrumentation(),
//       new MongoDBInstrumentation({ enhanceDatabaseReporting: true }),
//       new PinoInstrumentation()
//     ]
//   })

//   await sdk.start()
//   await fastify.register(fastifyOtel, {
//     wrapRoutes: true,
//     serviceName: process.env.OTEL_SERVICE_NAME || 'fastify-form-app'
//   })

//   fastify.addHook('onClose', async () => {
//     await sdk.shutdown()
//     await loggerProvider.shutdown?.()
//     await prometheusExporter.shutdown?.()
//   })
// }, { name: 'otel-grafana-plugin' })
