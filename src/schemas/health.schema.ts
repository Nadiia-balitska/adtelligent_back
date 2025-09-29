// JSON-схеми для Swagger/валідації

export const healthSchema = {
  tags: ['system'],
  summary: 'Service health',
  description: 'Загальний health сервісу + стан підключення до БД',
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok', 'degraded'] },
        prisma: { type: 'string', enum: ['ok', 'down', 'unknown'] },
        uptime: { type: 'number' }
      },
      required: ['status', 'prisma', 'uptime']
    }
  }
} as const;

export const healthDbSchema = {
  tags: ['system'],
  summary: 'Database health',
  description: 'Перевірка доступності БД',
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok'] }
      },
      required: ['status']
    },
    503: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['down'] },
        error: { type: 'string' }
      },
      required: ['status']
    }
  }
} as const;
