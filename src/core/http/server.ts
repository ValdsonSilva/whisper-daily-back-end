import 'dotenv/config'
// Isso garante que process.env.DATABASE_URL estará preenchida antes do Prisma tentar conectar.

import Fastify from 'fastify';
import prismaPlugin from './plugins/prisma.js';
import security from './plugins/security';
import zodValidator from './plugins/zodValidator';
import healthRoutes from '../../modules/health/health.routes';
import { userRoutes } from '../../modules/user/user.routes';
import { soundRoutes } from '../../modules/sound/sound.routes';
import { ritualRoutes } from '../../modules/ritual/ritual.routes';
import { noteRoutes } from '../../modules/note/note.routes';
import { whisperRoutes } from '../../modules/AI/AI.routes';
import { registerAnonymousRoutes } from '../../modules/auth/auth.controller.js';
import auth from './plugins/auth.js';

export const app = Fastify({ logger: true });

await app.register(security);
await app.register(zodValidator);
await app.register(prismaPlugin);
await app.register(auth);

// rotas
await app.register(healthRoutes, { prefix: '/api' });
await app.register(userRoutes, { prefix: '/api' });
await app.register(soundRoutes, { prefix: '/api' });
await app.register(ritualRoutes, { prefix: '/api' });
await app.register(noteRoutes, { prefix: '/api' });
await app.register(whisperRoutes, { prefix: "/api" });
await app.register(registerAnonymousRoutes, { prefix: "/api" });

const PORT = Number(process.env.PORT || 3333);

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`HTTP server running on http://localhost:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
