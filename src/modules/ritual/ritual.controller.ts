// src/modules/ritual/ritual.controller.ts
import { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { RitualRepo } from "./ritual.repo";

type IdParams = {
    id: string;
};

export const RitualController = {
    // ---------- GET /rituals ----------
    listAll: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const { userId } = req.query as { userId: string };
            const rituals = await RitualRepo.listByUser(userId);

            if (rituals.length === 0) {
                return reply.code(404).send({ message: "Rituais não encontrados" });
            }

            return reply.code(200).send({ rituals });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao listar rituais", error });
        }
    },

    // ---------- GET /rituals/:id ----------
    listById: async (
        req: FastifyRequest<{ Params: IdParams }>,
        reply: FastifyReply
    ) => {
        try {
            const { id } = req.params;

            const ritual = await RitualRepo.findById(id);

            if (!ritual) {
                return reply.code(404).send({ message: "Ritual não encontrado" });
            }

            return reply.code(200).send({ ritual });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao buscar ritual", error });
        }
    },

    // ---------- POST /rituals ----------
    create: async (
        req: FastifyRequest<{ Body: Prisma.RitualDayCreateInput }>,
        reply: FastifyReply
    ) => {
        try {
            const data = req.body;

            const ritual = await RitualRepo.create(data);

            return reply.code(201).send({ ritual });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao criar ritual", error });
        }
    },

    // ---------- PUT /rituals/:id ----------
    update: async (
        req: FastifyRequest<{ Params: IdParams; Body: Prisma.RitualDayUpdateInput }>,
        reply: FastifyReply
    ) => {
        try {
            const { id } = req.params;
            const data = req.body;

            const ritual = await RitualRepo.update(id, data);

            return reply.code(200).send({ ritual });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao atualizar ritual", error });
        }
    },

    // ---------- DELETE /rituals/:id ----------
    remove: async (
        req: FastifyRequest<{ Params: IdParams }>,
        reply: FastifyReply
    ) => {
        try {
            const { id } = req.params;

            const ritual = await RitualRepo.delete(id);

            return reply
                .code(200)
                .send({ message: "Ritual excluído com sucesso", ritual });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao excluir ritual", error });
        }
    },

    // ---------- POST /rituals/:id/checkin ----------
    registerCheckIn: async (
        req: FastifyRequest<{ Params: IdParams; Body: { achieved: boolean; aiReply?: string; microStep?: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const { id } = req.params;
            const { achieved, aiReply, microStep } = req.body;
            const localDate = new Date()
            const ritual = await RitualRepo.registerCheckIn(id, localDate, { achieved, aiReply, microStep });

            return reply.code(200).send({ ritual });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao registrar check-in", error });
        }
    },

    // ---------- POST /rituals/upsert ----------
    upsertMorning: async (
        req: FastifyRequest<{ Body: { userId: string; localDate: Date; title: string; note?: string; subtasks?: any[] } }>,
        reply: FastifyReply
    ) => {
        try {
            const { userId, localDate, title, note, subtasks } = req.body;

            const ritual = await RitualRepo.upsertMorning(userId, localDate, {
                title,
                note,
                subtasks,
            });

            return reply.code(200).send({ ritual });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao criar ou atualizar ritual da manhã", error });
        }
    },
};
