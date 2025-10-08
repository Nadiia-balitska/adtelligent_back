import fp from 'fastify-plugin'
import 'dotenv/config'

import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { FsInstrumentation } from '@opentelemetry/instrumentation-fs'
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb'
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino'
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'

export default fp(async function otelGrafanaPlugin(fastify) {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO)

  const svcName = process.env.OTEL_SERVICE_NAME || 'fastify-form-app'
  const svcVersion = process.env.OTEL_SERVICE_VERSION || '1.0.0'
  const env = process.env.NODE_ENV || 'development'

  if (!process.env.OTEL_RESOURCE_ATTRIBUTES) {
    process.env.OTEL_RESOURCE_ATTRIBUTES = [
      `service.name=${svcName}`,
      `service.version=${svcVersion}`,
      `deployment.environment=${env}`
    ].join(',')
  }

  const prometheusReader = new PrometheusExporter({
    port: Number(process.env.PROM_PORT || 9464),
    endpoint: process.env.PROM_ENDPOINT || '/metrics'
  })

  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces'
  })

  const logExporter = new OTLPLogExporter({
    url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT || 'http://localhost:4318/v1/logs'
  })

  const sdk = new NodeSDK({
    metricReader: prometheusReader,
    spanProcessors: [new BatchSpanProcessor(traceExporter)],
    logRecordProcessors: [new BatchLogRecordProcessor(logExporter)],
    instrumentations: [
      new FastifyInstrumentation({ ignoreLayersType: ['http'] }),
      new FsInstrumentation(),
      new MongoDBInstrumentation({ enhanceDatabaseReporting: true }),
      new PinoInstrumentation()
    ]
  })

  await sdk.start()
  fastify.log.info('OTEL Grafana plugin: started')

  fastify.addHook('onClose', async () => {
    await sdk.shutdown()
    if (typeof prometheusReader.shutdown === 'function') {
      await prometheusReader.shutdown()
    }
  })
}, { name: 'otel-grafana-plugin' })
