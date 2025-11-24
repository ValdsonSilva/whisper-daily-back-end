import prismaPkg from '@prisma/client';
import type { PrismaClient as PrismaClientType } from '@prisma/client';
import fp from 'fastify-plugin';

const { PrismaClient } = prismaPkg;

declare module 'fastify' {
    interface FastifyInstance {
        prisma: PrismaClientType;
    }
}

export default fp(async (app) => {
    const prisma = new PrismaClient();
    await prisma.$connect();

    app.decorate('prisma', prisma);

    app.addHook('onClose', async (instance) => {
        await instance.prisma.$disconnect();
    });
});
