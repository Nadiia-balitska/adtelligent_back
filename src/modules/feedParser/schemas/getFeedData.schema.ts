export const   schema ={
    tags: ['feed'],
        summary: 'Get feed data',
        description: 'Get feed data',
        response: {
        200: {
            type: 'object',
                properties: {
                hello: {
                    type: 'string',
                }
            }
        }
    }
} as const