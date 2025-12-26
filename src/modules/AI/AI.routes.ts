import { FastifyInstance } from 'fastify';
import { aiRoom, WhisperService } from './whisper.service';
import { WhisperMode } from './whisper.huggingFace.types';
import { AiChatRepo } from './AiChatRepo';
import { sendUserMessageAndAiReply } from './whisper.service';


export async function whisperRoutes(app: FastifyInstance) {
    const mustAuth = [app.auth].filter(Boolean);

    app.post('/ai/whisper/reply', async (req, reply) => {
        try {
            const body = req.body as {
                locale: string;
                message: string;
                mode?: WhisperMode; // manhã / noite / geral (conversa livre)
                context?: any;
            };

            if (!body?.message || typeof body.message !== 'string') {
                return reply.code(400).send({ message: 'Informe a mensagem' });
            }

            if (!body.locale) {
                return reply.status(400).send({ message: "Informe o locale" })
            }

            const response = await WhisperService.generateReply({
                message: body.message,
                mode: body.mode ?? 'general',
                context: body.context,
                language: body.locale,
            });

            return reply.code(200).send(response);
        } catch (error: any) {
            console.error('\nWhisper AI Liama endpoint error:', error);
            return reply.code(500).send({ message: 'Erro ao gerar resposta da Whisper' });
        }
    });

    // listar threads
    app.get('/ai/threads', { preHandler: mustAuth }, async (req: any) => {
        const userId = req.userId ?? req.user?.sub ?? req.user?.id;
        if (!userId) return req.reply.unauthorized();
        const { take, cursor } = req.query as { take?: string; cursor?: string };
        const takeNum = Math.min(Math.max(parseInt(take ?? '20', 10) || 20, 1), 100);
        return AiChatRepo.listThreads(userId, { take: takeNum, cursor: cursor || null });
    });

    // buscar mensagens da thread
    app.get<{ Params: { threadId: string } }>('/ai/threads/:threadId/messages', { preHandler: mustAuth }, async (req: any, reply) => {
        const userId = req.userId ?? req.user?.sub ?? req.user?.id;
        if (!userId) return reply.unauthorized();
        const { take, cursor } = req.query as { take?: string; cursor?: string };
        const takeNum = Math.min(Math.max(parseInt(take ?? '30', 10) || 30, 1), 200);
        return AiChatRepo.listMessages(req.params.threadId, userId, { take: takeNum, cursor: cursor || null });
    });

    // enviar mensagem e obter resposta da IA
    app.post('/ai/chat', { preHandler: mustAuth }, async (req: any, reply) => {
        const userId = req.userId ?? req.user?.sub ?? req.user?.id;
        if (!userId) return reply.unauthorized();
        const { content, threadId } = req.body as { content: string; threadId?: string | null };
        if (!content || !content.trim()) return reply.badRequest('Campo "content" é obrigatório.');
        const result = await sendUserMessageAndAiReply(app, { userId, content, threadId: threadId || null });
        return reply.code(201).send(result);
    });

    // soft delete da thread
    app.delete<{ Params: { threadId: string } }>('/ai/threads/:threadId', { preHandler: mustAuth }, async (req: any, reply) => {
        const userId = req.userId ?? req.user?.sub ?? req.user?.id;
        if (!userId) return reply.unauthorized();
        await AiChatRepo.softDeleteThread(req.params.threadId, userId);
        reply.code(204).send();
    });

    // Socket: entrar numa sala da thread (opcional, se você usa Socket.IO)
    // app.io.on('connection', (socket: any) => {
    //     socket.on('ai:join', ({ threadId }: { threadId: string }) => {
    //         if (threadId) socket.join(aiRoom(threadId));
    //     });
    //     socket.on('ai:leave', ({ threadId }: { threadId: string }) => {
    //         if (threadId) socket.leave(aiRoom(threadId));
    //     });
    // });
}

/**
 * Resumo do fluxo (do app até a IA)
 * O app (WhisperDaily) manda um POST para /ai/whisper/reply com:
 * {
  "message": "Hoje acordei cansado, meio desanimado.",
  "mode": "morning",
  "context": {
    "currentIntention": "ser mais gentil comigo",
    "whisperLeafEarnedToday": false,
    "lastMessages": [
      { "from": "user", "text": "Ontem foi pesado no trabalho." }
    ]
  }
}
 */
