import { Note, Prisma } from "@prisma/client";
import { prisma } from "../../core/config/prisma";

export const noteRepo = {
    listAll: async (): Promise<Note[]> => {
        return await prisma.note.findMany();
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