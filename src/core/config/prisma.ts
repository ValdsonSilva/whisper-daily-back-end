import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        // logs úteis em dev
        log: [{ emit: 'event', level: 'error' }],
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}