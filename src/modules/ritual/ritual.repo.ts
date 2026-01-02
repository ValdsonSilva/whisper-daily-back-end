// src/modules/ritual/ritual.repo.ts
import type { Prisma, RitualDay, RitualStatus } from "@prisma/client";
import { prisma } from "../../core/config/prisma";

export type ListByStatusParams = {
    status: RitualStatus | RitualStatus[]; // PLANNED | COMPLETED | MISSED (ou array)
    userId?: string;                       // opcional: filtra pelo dono
    dateFrom?: Date;                       // opcional
    dateTo?: Date;                         // opcional
    take?: number;                         // default: 20
    cursor?: string | null;                // paginação
    order?: 'asc' | 'desc';                // default: 'desc' por data
};

export type ListByStatusResult = {
    items: (RitualDay & { subtasks: any[] })[];
    nextCursor: string | null;
};

export const RitualRepo = {

    // ---------- Básico ----------
    findById: async (id: string): Promise<RitualDay | null> => {
        return await prisma.ritualDay.findUnique({
            where: { id },
            include: { subtasks: true },
        });
    },


    // ---------- Listar por status (com filtros e paginação por cursor) ----------
    listByStatus: async (params: ListByStatusParams): Promise<ListByStatusResult> => {
        const {
            status,
            userId,
            dateFrom,
            dateTo,
            take = 20,
            cursor = null,
            order = 'desc',
        } = params;

        // query
        const where: Prisma.RitualDayWhereInput = {
            status: Array.isArray(status) ? { in: status } : status, archived: false,
            ...(userId ? { userId } : {}),
            ...(dateFrom || dateTo ? {
                localDate: {
                    ...(dateFrom ? { gte: dateFrom } : {}),
                    ...(dateTo ? { lte: dateTo } : {}),
                },
            } : {}),
        };

        const rows = await prisma.ritualDay.findMany({
            where,
            include: { subtasks: true },
            orderBy: { localDate: order },         // ajuste para o seu campo de ordenação preferido
            take: take + 1,                        // pega 1 a mais para saber se tem próxima página
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const hasMore = rows.length > take;
        const items = hasMore ? rows.slice(0, take) : rows;
        const nextCursor = hasMore ? items[items.length - 1].id : null;

        return { items, nextCursor };
    },

    findByUserAndDate: async (
        userId: string,
        localDate: Date
    ): Promise<RitualDay | null> => {
        return await prisma.ritualDay.findUnique({
            where: {
                userId_localDate: { userId, localDate },
            },
            include: { subtasks: true },
        });
    },

    listByUser: async (userId: string): Promise<RitualDay[]> => {
        return await prisma.ritualDay.findMany({
            where: { userId, pastDue: false }, // objetivos ativos (dentro das 24 horas)
            orderBy: { localDate: "desc" },
            include: { subtasks: true },
        });
    },

    listByUserInRange: async (
        userId: string,
        from: Date,
        to: Date
    ): Promise<RitualDay[]> => {
        return await prisma.ritualDay.findMany({
            where: {
                userId,
                localDate: {
                    gte: from,
                    lte: to,
                },
            },
            orderBy: { localDate: "asc" },
            include: { subtasks: true },
        });
    },



    create: async (data: Prisma.RitualDayCreateInput): Promise<RitualDay> => {
        return await prisma.ritualDay.create({
            data,
            include: { subtasks: true },
        });
    },

    update: async (
        id: string,
        data: Prisma.RitualDayUpdateInput
    ): Promise<RitualDay> => {
        return await prisma.ritualDay.update({
            where: { id },
            data,
            include: { subtasks: true },
        });
    },

    delete: async (id: string): Promise<RitualDay> => {
        return await prisma.ritualDay.delete({
            where: { id },
            include: { subtasks: true },
        });
    },

    // ---------- Fluxo da manhã (planejamento) ----------

    /**
     * Cria ou atualiza o ritual da manhã (Hoje eu vou...) de um dia específico.
     * Usa o unique (userId, localDate) para garantir 1 ritual por dia.
     */
    upsertMorning: async (
        userId: string,
        localDate: Date,
        input: {
            title: string;
            note?: string | null;
            subtasks?: { content: string; order?: number; done?: boolean }[];
        }
    ): Promise<RitualDay> => {
        const { title, note, subtasks = [] } = input;

        return await prisma.ritualDay.upsert({
            where: {
                userId_localDate: { userId, localDate },
            },
            create: {
                user: { connect: { id: userId } },
                localDate,
                title,
                note,
                status: "PLANNED",
                subtasks: {
                    create: subtasks.map((st, index) => ({
                        content: st.content,
                        order: st.order ?? index,
                        done: st.done ?? false,
                    })),
                },
            },
            update: {
                title,
                note,
                // estratégia simples: recria subtasks a cada edição
                subtasks: {
                    deleteMany: {},
                    create: subtasks.map((st, index) => ({
                        content: st.content,
                        order: st.order ?? index,
                        done: st.done ?? false,
                    })),
                },
            },
            include: { subtasks: true },
        });
    },

    // ---------- Fluxo da noite (check-in) ----------

    /**
     * Registra o check-in noturno (sim/não) para um dia.
     * Usa (userId, localDate) como chave.
     */
    registerCheckIn: async (
        userId: string,
        localDate: Date,
        payload: { achieved: boolean | null; aiReply?: string | null; microStep?: string | null }
    ): Promise<RitualDay> => {
        const { achieved, aiReply, microStep } = payload;

        return await prisma.ritualDay.update({
            where: {
                userId_localDate: { userId, localDate },
            },
            data: {
                achieved,
                status: achieved ? "COMPLETED" : "MISSED",
                checkInAt: new Date(),
                aiReply,
                microStep,
            },
            include: { subtasks: true },
        });
    },
};
