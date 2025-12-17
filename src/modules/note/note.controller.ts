// src/modules/notes/routes.ts
import { FastifyInstance } from 'fastify';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { noteRepo as NoteRepo } from './note.repo';
import { uploadToCloudinaryStream, destroyFromCloudinary } from '../../core/config/cloudinary';
import { prisma } from '../../core/config/prisma';

const pump = promisify(pipeline);

function normalizeOrder(order?: string) {
    return order === 'asc' || order === 'desc' ? order : 'desc';
}

export async function registerNoteRoutes(app: FastifyInstance) {
    // const mustAuth = [app.authenticate].filter(Boolean);

    // GET /notes
    app.get('/notes', async (req: any) => {
        const userId = req.user.sub as string;
        const { archived, take, cursor, order } = req.query as {
            archived?: string;
            take?: string;
            cursor?: string;
            order?: 'asc' | 'desc' | string;
        };

        const takeNum = Math.min(Math.max(parseInt(take ?? '20', 10) || 20, 1), 100);
        const archivedBool = archived === 'true';

        return NoteRepo.listByUser({
            userId,
            archived: archivedBool,
            take: takeNum,
            cursor: cursor || null,
            order: normalizeOrder(order),
        });
    });

    // GET /notes/:id
    app.get<{ Params: { id: string } }>('/notes/:id', async (req: any, reply) => {
        const userId = req.user.sub as string;
        const note = await NoteRepo.findById(req.params.id, userId);
        if (!note) return reply.notFound('Nota não encontrada');
        return note;
    });

    // POST /notes  (multipart: title, content, files[])
    app.post('/notes', async (req: any, reply) => {
        const userId = req.user.sub as string;

        const parts = req.parts();
        let title: string | undefined;
        let content: string | undefined;
        const uploads: Array<Promise<any>> = [];

        for await (const part of parts) {
            if (part.type === 'file') {
                // upload para Cloudinary via stream
                const folder = `notes/${userId}`;
                const { handler, done } = uploadToCloudinaryStream({ folder, resource_type: 'auto' });
                uploads.push(done);
                await pump(part.file, handler);
            } else if (part.type === 'field') {
                if (part.fieldname === 'title') title = part.value;
                if (part.fieldname === 'content') content = part.value;
            }
        }

        if (!content || content.trim().length === 0) {
            return reply.badRequest('Campo "content" é obrigatório.');
        }

        // aguarda todos uploads concluírem
        const results = await Promise.all(uploads);

        const note = await NoteRepo.create({
            userId,
            title: title ?? null,
            content,
            attachments: results.map((r) => ({
                url: r.url,
                secureUrl: r.secure_url,
                publicId: r.public_id,
                resourceType: r.resource_type,
                format: r.format,
                bytes: r.bytes,
                width: r.width ?? null,
                height: r.height ?? null,
                duration: r.duration ?? null,
                originalFilename: r.original_filename,
            })),
        });

        reply.code(201).send(note);
    });

    // PATCH /notes/:id  (pode atualizar título/conteúdo, adicionar e remover anexos)
    app.patch<{ Params: { id: string } }>('/notes/:id', async (req: any, reply) => {
        const userId = req.user.sub as string;
        const noteId = req.params.id;

        const parts = req.parts();
        let title: string | undefined;
        let content: string | undefined;
        let removeAttachmentIds: string[] = [];
        const uploads: Array<Promise<any>> = [];

        for await (const part of parts) {
            if (part.type === 'file') {
                const { handler, done } = uploadToCloudinaryStream({ folder: `notes/${userId}`, resource_type: 'auto' });
                uploads.push(done);
                await pump(part.file, handler);
            } else if (part.type === 'field') {
                if (part.fieldname === 'title') title = part.value;
                if (part.fieldname === 'content') content = part.value;
                if (part.fieldname === 'removeAttachmentIds') {
                    try { removeAttachmentIds = JSON.parse(part.value); } catch { /* ignore */ }
                }
            }
        }

        const results = await Promise.all(uploads);

        // vamos destruir no Cloudinary somente após remover do banco com sucesso
        const toDestroy: Array<{ publicId: string; resourceType: 'image' | 'video' | 'raw' | 'auto' }> = [];
        if (removeAttachmentIds.length) {
            // coletar publicIds antes para destruir depois
            const found = await Promise.all(
                removeAttachmentIds.map((id: string) => NoteRepo.findAttachmentById(id, userId))
            );
            for (const a of found) {
                if (a) toDestroy.push({ publicId: a.publicId, resourceType: (a.resourceType as any) || 'image' });
            }
        }

        const updated = await NoteRepo.update({
            id: noteId,
            userId,
            title,
            content,
            removeAttachmentIds,
            addAttachments: results.map((r) => ({
                url: r.url,
                secureUrl: r.secure_url,
                publicId: r.public_id,
                resourceType: r.resource_type,
                format: r.format,
                bytes: r.bytes,
                width: r.width ?? null,
                height: r.height ?? null,
                duration: r.duration ?? null,
                originalFilename: r.original_filename,
            })),
        });

        // destruir no Cloudinary fora da transação
        await Promise.all(
            toDestroy.map((x) => destroyFromCloudinary(x.publicId, x.resourceType))
        ).catch(() => { /* se falhar, você pode enfileirar em uma outbox para retry */ });

        return updated;
    });

    // POST /notes/:id/archive
    app.post<{ Params: { id: string } }>('/notes/:id/archive', async (req: any, reply) => {
        const userId = req.user.sub as string;
        await NoteRepo.archive(req.params.id, userId);
        reply.code(204).send();
    });

    // POST /notes/:id/restore
    app.post<{ Params: { id: string } }>('/notes/:id/restore', async (req: any, reply) => {
        const userId = req.user.sub as string;
        await NoteRepo.restore(req.params.id, userId);
        reply.code(204).send();
    });

    // DELETE /notes/:id  (hard delete) — remove nota e apaga anexos no Cloudinary
    app.delete<{ Params: { id: string } }>('/notes/:id', async (req: any, reply) => {
        const userId = req.user.sub as string;
        const { attachmentPublicIds } = await NoteRepo.deleteHard(req.params.id, userId);

        await Promise.allSettled(
            attachmentPublicIds.map((publicId) => destroyFromCloudinary(publicId, 'auto'))
        );

        reply.code(204).send();
    });

    // DELETE /notes/:noteId/attachments/:attachmentId
    app.delete<{ Params: { noteId: string; attachmentId: string } }>(
        '/notes/:noteId/attachments/:attachmentId',
        async (req: any, reply) => {
            const userId = req.user.sub as string;
            const att = await NoteRepo.findAttachmentById(req.params.attachmentId, userId);
            if (!att || att.noteId !== req.params.noteId) return reply.notFound('Anexo não encontrado');

            await prisma.noteAttachment.delete({
                where: { id: att.id },
            });

            await destroyFromCloudinary(att.publicId, (att.resourceType as any) || 'auto').catch(() => { });
            reply.code(204).send();
        }
    );
}
