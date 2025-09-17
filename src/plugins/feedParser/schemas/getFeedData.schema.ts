export const schema = {
    description: 'Get feed data',
    tags: ['feed'],
    summary: 'Fetch and return feed data',
    response: {
        200: {
            type: 'object',
            properties: {
                hello: { type: 'string' }
            }
        }
    }
};