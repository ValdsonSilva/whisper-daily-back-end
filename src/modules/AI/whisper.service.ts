import { env } from "../../core/config/env"
import { WHISPER_SYSTEM_PROMPT } from './prompt';
import { WhisperRequest, WhisperResponse } from './whisper.huggingFace.types';
import type { FastifyInstance } from 'fastify';
import { askAi } from './provider';
import type { AiRole } from '@prisma/client';
import { AiChatRepo } from "./AiChatRepo";
import { emit } from "../../utils/realtime";
import { UserRepo } from "../user/user.repo";

export const aiRoom = (threadId: string) => `ai:${threadId}`;

// Palavras/expressões de crise simples (pode expandir depois)
const CRISIS_KEYWORDS = [
  'suicídio',
  'me matar',
  'me matar.',
  'me matar!',
  'quero morrer',
  'quero me matar',
  'tirar minha vida',
  'kill myself',
  'want to die',
  'suicide',
  'self-harm',
];

function containsCrisisSignal(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some(k => lower.includes(k));
}

// Resposta fixa de safety mode (sem precisar chamar o modelo)
function buildSafetyResponse(userLanguage: 'pt' | 'en' | 'other'): string {
  if (userLanguage === 'pt') {
    return (
      'Sinto muito que você esteja se sentindo assim, isso é realmente pesado.\n' +
      'Eu sou só uma IA e não consigo te proteger de verdade.\n' +
      'Se puder, procure alguém de confiança agora ou um serviço de emergência/saúde mental da sua região.\n' +
      'Você não precisa passar por isso sozinho(a).'
    );
  }

  // Default em inglês
  return (
    "I'm really sorry you're feeling this way, it sounds very heavy.\n" +
    "I’m only an AI and I can’t keep you safe in real life.\n" +
    "Please reach out to a trusted person or local emergency / mental health service right now.\n" +
    "You don’t have to go through this alone."
  );
}

export function detectLanguage(text: string): 'pt' | 'en' | 'other' {
  const t = text.toLowerCase();
  if (/[ãõáéíóúç]/.test(t) || t.includes('que ') || t.includes('não ')) return 'pt';
  if (/[a-z]/.test(t)) return 'en'; // bem toscão, mas suficiente pra MVP
  return 'other';
}

function buildUserContextSnippet(req: WhisperRequest): string {
  const parts: string[] = [];

  if (req.mode === 'morning') {
    parts.push('Mode: morning intention. Help the user find ONE gentle intention for today.');
  } else if (req.mode === 'night') {
    parts.push('Mode: night reflection. Help the user reflect kindly on today.');
  } else {
    parts.push('Mode: general grounding conversation.');
  }

  const ctx = req.context;
  if (!ctx) return parts.join('\n');

  if (ctx.currentIntention) {
    parts.push(`Current intention: 
            Today i will ${ctx.currentIntention}.
          `);
  }
  if (ctx.lastReflectionSummary) {
    parts.push(`Last reflection summary: ${ctx.lastReflectionSummary}`);
  }
  if (typeof ctx.whisperLeafEarnedToday === 'boolean') {
    parts.push(
      `WhisperLeaf today: ${ctx.whisperLeafEarnedToday ? 'user has already earned a Leaf today.' : 'no Leaf earned yet today.'
      }`,
    );
  }
  if (ctx.streakDays != null) {
    parts.push(`User streak (days in a row using the app): ${ctx.streakDays}`);
  }
  if (ctx.lastMessages && ctx.lastMessages.length > 0) {
    const history = ctx.lastMessages
      .slice(-5)
      .map(m => `${m.from === 'user' ? 'User' : 'Whisper'}: ${m.text}`)
      .join('\n');

    parts.push('Recent conversation (last messages):\n' + history);
  }

  return parts.join('\n');
}

export class WhisperService {
  static async generateReply(req: WhisperRequest): Promise<WhisperResponse> {

    const language = detectLanguage(req.message);
    const inCrisis = containsCrisisSignal(req.message);
    const userSavedLocale = req.language ?? ''

    if (inCrisis) {
      const reply = buildSafetyResponse(language);
      return { reply, safetyMode: true };
    }

    const contextSnippet = buildUserContextSnippet(req);

    const userContent = `
                Extra context:
                ${contextSnippet}

                Langue: 
                ${userSavedLocale}

                User message:
                ${req.message}
                `.trim();

    const response = await fetch(`${env.HF_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.HF_MODEL_ID, // "meta-llama/Llama-3.2-3B-Instruct:novita"
        messages: [
          { role: 'system', content: WHISPER_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        max_tokens: env.WHISPER_MAX_TOKENS,
        temperature: env.WHISPER_TEMPERATURE,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('HF error:', response.status, errorText);
      throw new Error(`HuggingFace request failed with status ${response.status}`);
    }

    const data: any = await response.json();

    const replyText: string =
      data?.choices?.[0]?.message?.content?.trim() ??
      'Desculpa, tive um problema para gerar uma resposta agora. Podemos tentar de novo?';

    const finalReply = replyText.slice(0, 1200);

    return {
      reply: finalReply,
      safetyMode: false,
    };
  }
}

// meta-llama/Llama-3.2-3B-Instruct

export async function sendUserMessageAndAiReply(app: FastifyInstance, params: {
  userId: string;
  content: string;
  threadId?: string | null;
}) {
  const thread = await AiChatRepo.ensureThread(params.userId, params.threadId);

  // 1) mensagem do usuário
  const userMsg = await AiChatRepo.addMessage({
    threadId: thread.id,
    role: 'USER' as AiRole,
    content: params.content.trim(),
  });

  emit(app, aiRoom(thread.id), 'ai:message:new', userMsg);

  // 2) histórico recente no formato do provider
  const { items: last } = await AiChatRepo.listMessages(thread.id, params.userId, { take: 30 });
  const history = last.map(m => ({
    role: m.role === 'ASSISTANT' ? 'assistant' : m.role === 'SYSTEM' ? 'system' : 'user',
    content: m.content,
  }));

  emit(app, aiRoom(thread.id), 'ai:typing', { threadId: thread.id, isTyping: true });

  const user = await UserRepo.listUserById(params.userId);
  if (!user) throw new Error('usuário não encontrado para AI');

  const locale = user.locale;

  // 3) chama IA
  let reply = '';
  let model: string | undefined;
  let tokens: number | undefined;
  let latencyMs: number | undefined;
  let meta: any | undefined;
  try {
    const res = await askAi(app, { userId: params.userId, threadId: thread.id, locale, message: userMsg.content as any });
    reply = res.reply;
    model = res.model;
    tokens = res.tokens;
    latencyMs = res.latencyMs;
    meta = res.meta;
  } finally {
    emit(app, aiRoom(thread.id), 'ai:typing', { threadId: thread.id, isTyping: false });
  }

  // 4) mensagem da IA
  const aiMsg = await AiChatRepo.addMessage({
    threadId: thread.id,
    role: 'ASSISTANT' as AiRole,
    content: reply,
    model,
    tokens,
    latencyMs,
    meta,
  });
  emit(app, aiRoom(thread.id), 'ai:message:new', aiMsg);

  return { threadId: thread.id, userMessageId: userMsg.id, aiMessageId: aiMsg.id };
}