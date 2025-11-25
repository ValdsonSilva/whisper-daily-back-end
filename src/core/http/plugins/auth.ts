import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';

// para protejer as rotas com { preHandler: app.auth }.

export default fp(async (app) => {
    await app.register(jwt, { secret: process.env.JWT_SECRET! });
    app.decorate('auth', async (req: any, reply: any) => {
        try {
            await req.jwtVerify();
        } catch {
            return reply.unauthorized();
        }
    });
});

declare module 'fastify' {
    interface FastifyInstance {
        auth: (req: any, reply: any) => Promise<void>;
    }
}
