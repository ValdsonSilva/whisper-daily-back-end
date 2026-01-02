// src/modules/ritual/ritual.controller.ts
import { FastifyReply, FastifyRequest } from "fastify";
import { RitualStatus, type Prisma } from '@prisma/client';
import { RitualRepo } from "./ritual.repo";
import { WhisperService } from "../AI/whisper.service";
import { UserRepo } from "../user/user.repo";
import { messagePromptInUserLanguage } from "../../utils/messagePromptInUserLanguage";
import { buildServiceMessage } from "../../utils/serviceMessage";

function parseStatus(input?: RitualStatus | RitualStatus[]): RitualStatus[] {
    if (!input) return [];

    // Garante que é um array, mantendo a tipagem correta
    const list = Array.isArray(input) ? input : [input];

    // Usa Set apenas para remover duplicatas
    const uniqueStatuses = new Set(list);

    return Array.from(uniqueStatuses);
}

function parseDate(d?: string) {
    if (!d) return undefined;
    // aceita "YYYY-MM-DD" ou ISO; se for só data, cria Date no início do dia local
    const date = new Date(d);
    return isNaN(+date) ? undefined : date;
}

type IdParams = {
    id: string;
};

export const RitualController = {
    // ---------- GET /rituals ----------
    listAll: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const { userId } = req.query as { userId: string };
            // lista todas os rituais ativos do usuário
            const rituals = await RitualRepo.listByUser(userId);

            if (rituals.length === 0) {
                return reply.code(404).send({ message: "Rituais não encontrados" });
            }

            return reply.code(200).send({ rituals });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao listar rituais", error });
        }
    },

    // --------- GET /rituals/status ----------------
    listByStatus: async (req: FastifyRequest, reply: FastifyReply) => {
        const {
            status,
            userId,
            dateFrom,
            dateTo,
            take,
            cursor,
            order,
        } = req.query as {
            status?: RitualStatus | RitualStatus[];
            userId?: string;
            dateFrom?: string;
            dateTo?: string;
            take?: string;
            cursor?: string;
            order?: 'asc' | 'desc' | string;
        };

        const statuses = parseStatus(status);
        if (!statuses.length) {
            return reply.badRequest('Parâmetro "status" é obrigatório (ex.: PLANNED ou PLANNED,COMPLETED, MISSED).');
        }

        const takeNum = Math.min(Math.max(parseInt(take ?? '20', 10) || 20, 1), 100);
        const orderNorm = (order === 'asc' || order === 'desc') ? order : 'desc';

        const { items, nextCursor } = await RitualRepo.listByStatus({
            status: statuses.length === 1 ? statuses[0] : statuses,
            userId,
            dateFrom: parseDate(dateFrom),
            dateTo: parseDate(dateTo),
            take: takeNum,
            cursor: cursor || null,
            order: orderNorm,
        });

        return reply.status(200).send({ items, nextCursor });
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

            console.log(`Tentando excluir ritual com id: ${id}`);

            const findedRitual = await RitualRepo.findById(id);

            console.log("Ritual encontrado: ", findedRitual);

            if (!findedRitual) {
                return reply.code(404).send({ message: "Ritual não encontrado para exclusão" });
            }

            const ritual = await RitualRepo.delete(findedRitual.id);

            return reply.code(200).send({ message: "Ritual excluído com sucesso", ritual });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao excluir ritual", error });
        }
    },

    // ---------- POST /rituals/:id/checkin ----------
    registerCheckIn: async (
        req: FastifyRequest<{ Params: { id: string }; Body: { achieved: boolean | null; aiReply?: string; microStep?: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const { id } = req.params;
            const { achieved } = req.body;

            const prevRitual = await RitualRepo.listByUser(id); // ritual previamente criado do usuário

            if (prevRitual.length === 0) {
                return reply.status(404).send({ message: "Ritual não encontrado" });
            }

            console.log("Ritual encontrado:", prevRitual[0]);
            // ou, se quiser ver tudo em JSON:
            console.log("Ritual encontrado JSON:", JSON.stringify(prevRitual[0], null, 2));

            const user = await UserRepo.listUserById(id);

            if (!user) {
                return reply.status(404).send({ message: "Usuário não encontrado" });
            }

            const message = buildServiceMessage({
                achieved,
                title: prevRitual[0].title,
                locale: user?.locale,          // "pt-BR", "en-US", etc.
                subjectPt: 'ritual',          // opcional
                subjectEn: 'ritual',          // opcional
            });

            if (!message) return reply.status(500).send({ message: "Erro ao gerar mensagem" });

            const whisperAI = await WhisperService.generateReply({
                context: {
                    currentIntention: `${prevRitual[0].title}. My extra notes: ${prevRitual[0].note}`,
                    lastMessages: [
                        {
                            from: "user",
                            text: `${prevRitual[0].note}`,  // Passando a última mensagem
                        }
                    ],
                },
                message, // idioma do usuário
                mode: "night", // Modo de reflexão ao fim do dia
            });

            if (!whisperAI) {
                return reply.status(500).send({ message: "Erro no assistente de IA" });
            }
            console.log("Resposta da IA:", whisperAI);
            console.log("Resposta da IA (reply):", whisperAI.reply);
            // ou JSON:
            console.log("Resposta da IA JSON:", JSON.stringify(whisperAI, null, 2));

            // const localDate = new Date();
            const ritual = await RitualRepo.registerCheckIn(id, prevRitual[0].localDate, { achieved, aiReply: whisperAI.reply });
            console.log('Ritual salvo:', ritual);

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


            if (!userId || !localDate || !title) {
                return reply.status(400).send({ message: "UserId & localDate & title são obrigatórios" });
            }

            // Agora vamos criar ou atualizar o ritual da manhã no banco de dados
            const ritual = await RitualRepo.upsertMorning(userId, localDate, {
                title,
                note,
                subtasks,
            });

            // Incluímos a resposta da IA no retorno
            return reply.code(200).send({ ritual });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao criar ou atualizar ritual da manhã", error });
        }
    }

};
