// src/utils/realtime.ts
import type { FastifyInstance } from 'fastify';

export function emit(app: FastifyInstance, room: string, event: string, payload: any) {
    // só emite se o plugin Socket.IO estiver ativo
    (app as any).io?.to(room).emit(event, payload);
}

export const userRoom = (userId: string) => `user:${userId}`;