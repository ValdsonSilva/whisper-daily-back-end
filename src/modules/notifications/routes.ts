import type { FastifyInstance } from 'fastify';
import { prisma } from '../../core/config/prisma';

export async function registerPushRoutes(app: FastifyInstance) {
  const mustAuth = [app.auth].filter(Boolean);

  app.post('/push/devices', { preHandler: mustAuth }, async (req: any, reply) => {
    const userId = req.userId ?? req.user?.sub ?? req.body.userId;
    
    const { token, platform, appVersion } = req.body as {
      token: string; platform: 'ios' | 'android' | 'web'; appVersion?: string;
    };

    if (!token || !platform) return reply.badRequest('token e platform são obrigatórios');

    const device = await prisma.pushDevice.upsert({
      where: { token },
      update: { userId, platform, appVersion, disabled: false, lastSeenAt: new Date() },
      create: { userId, token, platform, appVersion },
    });

    return reply.code(201).send({ ok: true, deviceId: device.id });
  });

  app.delete('/push/devices/:token', { preHandler: mustAuth }, async (req: any, reply) => {
    const userId = req.userId ?? req.user?.sub ?? req.body.userId;
    const { token } = req.params as { token: string };
    await prisma.pushDevice.updateMany({ where: { token, userId }, data: { disabled: true } });
    reply.code(204).send();
  });
}
