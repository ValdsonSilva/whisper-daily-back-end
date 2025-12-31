import type { Note, Prisma, NoteAttachment } from '@prisma/client';
import { prisma } from "../../core/config/prisma";

export type NoteWithAttachments = Note & { attachments: NoteAttachment[] };

export const noteRepo = {
    findById: async (id: string, userId: string): Promise<NoteWithAttachments | null> => {
        return prisma.note.findFirst({
            where: { id, userId },
            include: { noteAttachments: true as any }, // Prisma inferirá a relação
        }) as any;
    },

    listByUser: async (params: {
        userId: string;
        archived?: boolean;         // default: false
        take?: number;               // default: 20
        cursor?: string | null;
        order?: 'asc' | 'desc';      // default: desc (mais recentes)
    }): Promise<{ items: NoteWithAttachments[]; nextCursor: string | null, total: number }> => {
        const { userId, archived = false, take = 20, cursor = null, order = 'desc' } = params;

        const where: Prisma.NoteWhereInput = {
            userId,
            archivedAt: archived ? { not: null } : null,
        };

        const rows = await prisma.note.findMany({
            where,
            include: { noteAttachments: true },
            orderBy: { createdAt: order },
            take: take + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        const total = rows.length ? rows.length : 0;
        const hasMore = total > take;
        const slicedRows = hasMore ? rows.slice(0, take) : rows;
        const items = slicedRows.map(row => ({
            ...row,
            attachments: row.noteAttachments,
        })) as NoteWithAttachments[];
        const nextCursor = hasMore ? items[items.length - 1].id : null;
        return { items, nextCursor, total };
    },

    create: async (params: {
        userId: string;
        title?: string | null;
        content: string;
        attachments?: Array<{
            url: string;
            secureUrl: string;
            publicId: string;
            resourceType: string;
            format?: string | null;
            bytes?: number | null;
            width?: number | null;
            height?: number | null;
            duration?: number | null;
            originalFilename?: string | null;
        }>;
    }): Promise<NoteWithAttachments> => {
        return prisma.$transaction(async (tx) => {
            const note = await tx.note.create({
                data: {
                    userId: params.userId,
                    title: params.title ?? null,
                    content: params.content,
                },
            });

            if (params.attachments?.length) {
                await tx.noteAttachment.createMany({
                    data: params.attachments.map((a) => ({
                        noteId: note.id,
                        userId: params.userId,
                        url: a.url,
                        secureUrl: a.secureUrl,
                        publicId: a.publicId,
                        resourceType: a.resourceType,
                        format: a.format ?? undefined,
                        bytes: a.bytes ?? undefined,
                        width: a.width ?? undefined,
                        height: a.height ?? undefined,
                        duration: a.duration ?? undefined,
                        originalFilename: a.originalFilename ?? undefined,
                    })),
                });
            }

            const full = await tx.note.findUnique({
                where: { id: note.id },
                include: { noteAttachments: true },
            });

            return {
                ...full!,
                attachments: full!.noteAttachments,
            } as NoteWithAttachments;
        });
    },

    update: async (params: {
        id: string;
        userId: string;
        title?: string | null;
        content?: string | null;
        addAttachments?: Array<{
            url: string;
            secureUrl: string;
            publicId: string;
            resourceType: string;
            format?: string | null;
            bytes?: number | null;
            width?: number | null;
            height?: number | null;
            duration?: number | null;
            originalFilename?: string | null;
        }>;
        removeAttachmentIds?: string[];
    }): Promise<NoteWithAttachments> => {
        return prisma.$transaction(async (tx) => {
            // ownership check
            const existing = await tx.note.findFirst({ where: { id: params.id, userId: params.userId } });
            if (!existing) throw new Error('not_found');

            if (params.title !== undefined || params.content !== undefined) {
                await tx.note.update({
                    where: { id: params.id },
                    data: {
                        ...(params.title !== undefined ? { title: params.title } : {}),
                        ...(params.content !== undefined ? { content: params.content! } : {}),
                    },
                });
            }

            if (params.removeAttachmentIds?.length) {
                await tx.noteAttachment.deleteMany({
                    where: { id: { in: params.removeAttachmentIds }, noteId: params.id, userId: params.userId },
                });
            }

            if (params.addAttachments?.length) {
                await tx.noteAttachment.createMany({
                    data: params.addAttachments.map((a) => ({
                        noteId: params.id,
                        userId: params.userId,
                        url: a.url,
                        secureUrl: a.secureUrl,
                        publicId: a.publicId,
                        resourceType: a.resourceType,
                        format: a.format ?? undefined,
                        bytes: a.bytes ?? undefined,
                        width: a.width ?? undefined,
                        height: a.height ?? undefined,
                        duration: a.duration ?? undefined,
                        originalFilename: a.originalFilename ?? undefined,
                    })),
                });
            }

            const full = await tx.note.findUnique({
                where: { id: params.id },
                include: { noteAttachments: true },
            });

            return full as any;
        });
    },

    archive: async (id: string, userId: string): Promise<void> => {
        await prisma.note.updateMany({
            where: { id, userId, archivedAt: null },
            data: { archivedAt: new Date() },
        });
    },

    restore: async (id: string, userId: string): Promise<void> => {
        await prisma.note.updateMany({
            where: { id, userId, archivedAt: { not: null } },
            data: { archivedAt: null },
        });
    },

    deleteHard: async (id: string, userId: string): Promise<{ attachmentPublicIds: string[] }> => {
        // Retorna publicIds para remoção no Cloudinary (fora da transação)
        return prisma.$transaction(async (tx) => {
            // vai procurar os anexos com base no id da nota do usuário
            const atts = await tx.noteAttachment.findMany({
                where: { noteId: id, userId },
                select: { publicId: true, resourceType: true },
            });

            // deleta as notas
            await tx.note.deleteMany({ where: { id, userId } });

            return { attachmentPublicIds: atts.map((a) => a.publicId) };
        });
    },

    findAttachmentById: (attachmentId: string, userId: string) =>
        prisma.noteAttachment.findFirst({ where: { id: attachmentId, userId } }),
};