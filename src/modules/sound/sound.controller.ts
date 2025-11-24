// src/modules/sound/sound.controller.ts
import { FastifyReply, FastifyRequest } from "fastify";
import prismaPkg from '@prisma/client';
const { Prisma } = prismaPkg; import { SoundRepo } from "./sound.repo";

type IdParams = {
    id: string;
};

export const SoundController = {
    // GET /sounds
    listAll: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const sounds = await SoundRepo.listAllSounds();

            if (!sounds || sounds.length === 0) {
                return reply.code(404).send({ message: "Sons não encontrados" });
            }

            return reply.code(200).send({ sounds });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao listar sons", error });
        }
    },

    // GET /sounds/:id
    listById: async (
        req: FastifyRequest<{ Params: IdParams }>,
        reply: FastifyReply
    ) => {
        try {
            const { id } = req.params;

            const sound = await SoundRepo.listSoundByUserId(id);

            if (!sound) {
                return reply.code(404).send({ message: "Som não encontrado" });
            }

            return reply.code(200).send({ sound });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao buscar som", error });
        }
    },

    // POST /sounds
    create: async (
        req: FastifyRequest<{ Body: Prisma.AmbientSoundCreateInput }>,
        reply: FastifyReply
    ) => {
        try {
            const data = req.body;

            const sound = await SoundRepo.createSound(data);

            if (!sound) {
                // bem defensivo – em teoria Prisma sempre retorna
                return reply.code(500).send({ message: "Erro ao criar som" });
            }

            return reply.code(201).send({ sound });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao criar som", error });
        }
    },

    // PUT /sounds/:id
    update: async (
        req: FastifyRequest<{
            Params: IdParams;
            Body: Prisma.AmbientSoundUpdateInput;
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { id } = req.params;
            const data = req.body;

            const sound = await SoundRepo.updateSound(id, data);

            if (!sound) {
                return reply.code(404).send({ message: "Som não encontrado para atualização" });
            }

            return reply.code(200).send({ sound });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao atualizar som", error });
        }
    },

    // DELETE /sounds/:id
    remove: async (
        req: FastifyRequest<{ Params: IdParams }>,
        reply: FastifyReply
    ) => {
        try {
            const { id } = req.params;

            const sound = await SoundRepo.deleteSound(id);

            if (!sound) {
                return reply.code(404).send({ message: "Som não encontrado para exclusão" });
            }

            return reply.code(200).send({ message: "Som excluído com sucesso", sound });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao excluir som", error });
        }
    },
};
