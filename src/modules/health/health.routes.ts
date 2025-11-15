import { FastifyInstance } from 'fastify';

export default async function routes(app: FastifyInstance) {
  app.get('/health', async () => ({ ok: true, ts: new Date().toISOString(), message: "Running good" }));
}
