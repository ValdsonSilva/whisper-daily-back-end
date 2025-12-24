// src/repositories/AiChatRepo.ts
import type { AiRole, AiThread, AiMessage } from '@prisma/client';
import { prisma } from '../../core/config/prisma';

export const AiChatRepo = {
    ensureThread: async (userId: string, threadId?: string | null): Promise<AiThread> => {
        if (threadId) {
            const t = await prisma.aiThread.findFirst({ where: { id: threadId, userId, deletedAt: null } });
            if (!t) throw new Error('thread_not_found_or_forbidden');
            return t;
        }
        const t = await prisma.aiThread.create({ data: { userId } });
        return t;
    },

    addMessage: async (params: {
        threadId: string;
        role: AiRole;
        content: string;
        model?: string | null;
        tokens?: number | null;
        latencyMs?: number | null;
        error?: string | null;
        meta?: any;
    }): Promise<AiMessage> => {
        const msg = await prisma.aiMessage.create({
            data: {
                threadId: params.threadId,
                role: params.role,
                content: params.content,
                model: params.model ?? null,
                tokens: params.tokens ?? null,
                latencyMs: params.latencyMs ?? null,
                error: params.error ?? null,
                meta: params.meta ?? undefined,
            },
        });

        await prisma.aiThread.update({
            where: { id: params.threadId },
            data: { lastMessageAt: msg.createdAt },
        });

        return msg;
    },

    listThreads: async (userId: string, opts?: {
        take?: number;
        cursor?: string | null;
    }) => {
        const take = Math.min(Math.max(opts?.take ?? 20, 1), 100);
        const rows = await prisma.aiThread.findMany({
            where: { userId, deletedAt: null },
            orderBy: { lastMessageAt: 'desc' },
            take: take + 1,
            ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
        });
        const hasMore = rows.length > take;
        const items = hasMore ? rows.slice(0, take) : rows;
        return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
    },

    listMessages: async (threadId: string, userId: string, opts?: {
        take?: number;
        cursor?: string | null;
    }) => {
        // autorização: thread pertence ao user?
        const thread = await prisma.aiThread.findFirst({ where: { id: threadId, userId, deletedAt: null } });
        if (!thread) throw new Error('thread_not_found_or_forbidden');

        const take = Math.min(Math.max(opts?.take ?? 30, 1), 200);
        const rows = await prisma.aiMessage.findMany({
            where: { threadId },
            orderBy: { createdAt: 'desc' },
            take: take + 1,
            ...(opts?.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
        });

        const hasMore = rows.length > take;
        const items = (hasMore ? rows.slice(0, take) : rows).reverse(); // do mais antigo p/ mais novo
        return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
    },

    softDeleteThread: async (threadId: string, userId: string) => {
        await prisma.aiThread.updateMany({
            where: { id: threadId, userId, deletedAt: null },
            data: { deletedAt: new Date() },
        });
    },
};
