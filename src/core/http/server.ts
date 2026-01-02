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
import { whisperRoutes } from '../../modules/AI/AI.routes';
import { registerAnonymousRoutes } from '../../modules/auth/auth.controller.js';
import auth from './plugins/auth.js';
import multipart from '@fastify/multipart';
import { registerNoteRoutes } from '../../modules/note/note.controller.js';
import socketIo from './plugins/socket-io.js';
import { startMissedRitualSweeper } from '../../modules/ritual/missed-wisper.service.js';
import { startRitualReminderService } from '../../modules/ritual/ritual-reminder.service.js';

export const app = Fastify({ logger: true });

await app.register(security);
await app.register(zodValidator);
await app.register(prismaPlugin);
await app.register(auth);
await app.register(multipart, {
  attachFieldsToBody: false, // vamos ler via req.parts()
  limits: { files: 10, fileSize: 15 * 1024 * 1024 }, // 10 arquivos, 15MB cada (ajuste)
});
await app.register(socketIo);

// rotas
await app.register(healthRoutes, { prefix: '/api' });
await app.register(userRoutes, { prefix: '/api' });
await app.register(soundRoutes, { prefix: '/api' });
await app.register(ritualRoutes, { prefix: '/api' });
await app.register(registerNoteRoutes, { prefix: '/api' });
await app.register(whisperRoutes, { prefix: "/api" });
await app.register(registerAnonymousRoutes, { prefix: "/api" });

// inicia o job recorrente ao subir o servidor
startMissedRitualSweeper(app);
// inicia o lembrete recorrente ao subir o servidor
startRitualReminderService(app);

const PORT = Number(process.env.PORT || 3333);

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`HTTP server running on http://localhost:${PORT}`);
  app.log.info({ hasIo: app.hasDecorator('io') }, 'socket-io-ready');
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
