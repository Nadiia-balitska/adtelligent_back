import fp from 'fastify-plugin'
import fastifyOtel from '@fastify/otel'
import 'dotenv/config'
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { Resource } from '@opentelemetry/resources'
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT
} from '@opentelemetry/semantic-conventions'
import { SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node'
import { PeriodicExportingMetricReader, ConsoleMetricExporter } from '@opentelemetry/sdk-metrics'
import { SimpleLogRecordProcessor, ConsoleLogRecordExporter } from '@opentelemetry/sdk-logs'
import { FsInstrumentation } from '@opentelemetry/instrumentation-fs'
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb'
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino'

export default fp(async function otelConsolePlugin(fastify) {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO)

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'fastify-form-app',
    [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || '1.0.0',
    [ATTR_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development'
  })

  const sdk = new NodeSDK({
    resource,
    spanProcessor: new SimpleSpanProcessor(new ConsoleSpanExporter()),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new ConsoleMetricExporter()
    }),
    logRecordProcessor: new SimpleLogRecordProcessor(new ConsoleLogRecordExporter()),
    instrumentations: [
      new FsInstrumentation(),
      new MongoDBInstrumentation({ enhanceDatabaseReporting: true }),
      new PinoInstrumentation()
    ]
  })

  await sdk.start()
  fastify.log.info('OTEL console plugin: started')

  await fastify.register(fastifyOtel, {
    wrapRoutes: true,
    serviceName: process.env.OTEL_SERVICE_NAME || 'fastify-form-app'
  })

  fastify.addHook('onClose', async () => {
    await sdk.shutdown()
  })
}, { name: 'otel-console-plugin' })
