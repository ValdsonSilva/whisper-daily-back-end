import type { Note, Prisma } from '@prisma/client';
import { prisma } from "../../core/config/prisma";

export const noteRepo = {
    listAll: async (
        id?: string,
        userId?: string
    ): Promise<Note[]> => {

        const where: any = {};

        // Condicionalmente adiciona os filtros
        if (id) where.id = id;
        if (userId) where.userId = userId;

        return await prisma.note.findMany({
            where: where,
        });
    },

    listNoteById: async (id: string): Promise<Note | null> => {
        return await prisma.note.findUnique({
            where: { id }
        });
    },

    create: async (data: Prisma.NoteCreateInput): Promise<Note> => {
        return await prisma.note.create({ data });
    },

    update: async (id: string, data: Prisma.NoteUpdateInput): Promise<Note | null> => {
        return await prisma.note.update({
            where: { id },
            data
        });
    },

    delete: async (id: string): Promise<Note> => {
        return await prisma.note.delete({
            where: { id }
        })
    },
};