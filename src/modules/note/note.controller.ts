// src/modules/note/note.controller.ts
import { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { noteRepo } from "./note.repo";

type IdParams = {
    id: string;
};

export const NoteController = {
    // ---------- GET /notes ----------
    listAll: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const notes = await noteRepo.listAll();

            if (notes.length === 0) {
                return reply.code(404).send({ message: "Notas não encontradas" });
            }

            return reply.code(200).send({ notes });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao listar notas", error });
        }
    },

    // ---------- GET /notes/:id ----------
    listById: async (
        req: FastifyRequest<{ Params: IdParams }>,
        reply: FastifyReply
    ) => {
        try {
            const { id } = req.params;

            const note = await noteRepo.listNoteById(id);

            if (!note) {
                return reply.code(404).send({ message: "Nota não encontrada" });
            }

            return reply.code(200).send({ note });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao buscar nota", error });
        }
    },

    // ---------- POST /notes ----------
    create: async (
        req: FastifyRequest<{ Body: Prisma.NoteCreateInput }>,
        reply: FastifyReply
    ) => {
        try {
            const data = req.body;

            const note = await noteRepo.create(data);

            return reply.code(201).send({ note });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao criar nota", error });
        }
    },

    // ---------- PUT /notes/:id ----------
    update: async (
        req: FastifyRequest<{ Params: IdParams; Body: Prisma.NoteUpdateInput }>,
        reply: FastifyReply
    ) => {
        try {
            const { id } = req.params;
            const data = req.body;

            const note = await noteRepo.update(id, data);

            if (!note) {
                return reply.code(404).send({ message: "Nota não encontrada" });
            }

            return reply.code(200).send({ note });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao atualizar nota", error });
        }
    },

    // ---------- DELETE /notes/:id ----------
    remove: async (
        req: FastifyRequest<{ Params: IdParams }>,
        reply: FastifyReply
    ) => {
        try {
            const { id } = req.params;

            const note = await noteRepo.delete(id);

            // Verifica se a nota foi realmente deletada
            if (!note) {
                return reply.code(404).send({ message: "Nota não encontrada" });
            }

            return reply.code(200).send({ message: "Nota excluída com sucesso", note });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao excluir nota", error });
        }
    }
};
