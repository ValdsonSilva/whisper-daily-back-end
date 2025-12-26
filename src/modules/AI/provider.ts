import type { FastifyInstance } from 'fastify';

type AiAnswerResponse = { reply: string; model?: string; tokens?: number; latencyMs?: number; meta?: any };

export async function askAi(
    app: FastifyInstance,
    payload: { userId?: string; threadId?: string; locale: string; message: string }
): Promise<AiAnswerResponse> {
    const route = process.env.AI_INTERNAL_ROUTE || '/ai/answer';
    const res = await app.inject({ method: 'POST', url: route, payload, headers: { 'content-type': 'application/json' } });
    if (res.statusCode >= 400) {
        app.log.error({ status: res.statusCode, body: res.body }, 'ai_route_failed'); // <— veja a mensagem exata
        throw new Error(`ai_provider_failed_${res.statusCode}`);
    }
    const data = res.json() as AiAnswerResponse;
    if (!data?.reply) throw new Error('ai_provider_empty_reply');
    return data;
}
