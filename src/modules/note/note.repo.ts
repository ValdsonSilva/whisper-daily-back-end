import type { Note, Prisma } from '@prisma/client';
import { prisma } from "../../core/config/prisma";

export const noteRepo = {
    listAll: async (
        id?: string,
        userId?: string
    ): Promise<Note[]> => {
        // O objeto 'where' aceitará { id?: string, userId?: string }
        // e incluirá apenas os campos que não são undefined.
        return await prisma.note.findMany({
            where: {
                id: id,      // ou simplesmente 'id' em ES6+
                userId: userId // ou simplesmente 'userId' em ES6+
            }
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