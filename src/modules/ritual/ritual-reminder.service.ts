// src/modules/rituals/ritual-reminder.service.ts
import type { FastifyInstance } from 'fastify';
import { DateTime } from 'luxon';
import { getReminderUtcForRitual } from '../../utils/time';
import { emit, userRoom } from '../../utils/realtime';
import { prisma } from '../../core/config/prisma';
import { buildReminderMessage } from './notification-copy';
import { isValidExpoToken, sendExpoPush } from '../../core/config/expo';

const INTERVAL_MS = 60_000; // 1 min
const SCAN_LIMIT = 200;
const WINDOW_MINUTES = 5;

// Evita reenvio repetido na janela (memória do processo)
const sentCache = new Map<string, number>();
const SENT_TTL_MS = 15 * 60_000; // 15 min

let timer: NodeJS.Timeout | null = null;
let running = false;

export function startRitualReminderService(app: FastifyInstance) {
    // impede múltiplas inicializações em dev (ts-node-dev/nodemon)
    if ((global as any)._ritualReminderStarted) {
        app.log.info('ritual-reminder already started; skipping');
        return;
    }
    (global as any)._ritualReminderStarted = true;

    app.log.info(
        { intervalMs: INTERVAL_MS, scanLimit: SCAN_LIMIT, windowMinutes: WINDOW_MINUTES },
        'ritual-reminder service started'
    );

    const pruneCache = (nowMs: number) => {
        for (const [key, ts] of sentCache.entries()) {
            if (nowMs - ts > SENT_TTL_MS) sentCache.delete(key);
        }
    };

    const tick = async () => {
        if (running) return; // evita sobreposição
        running = true;

        const tickStartMs = Date.now();
        try {
            pruneCache(tickStartMs);

            // 1) Busca batch de rituais
            const rituals = await prisma.ritualDay.findMany({
                where: { status: 'PLANNED', achieved: null, checkInAt: null },
                include: {
                    user: {
                        select: {
                            id: true,
                            displayName: true,
                            timezone: true,
                            checkInHour: true,
                            checkInMinute: true,
                        },
                    },
                },
                // Evita starvation de rituais recentes ficando fora do batch
                // (não é perfeito sem reminderAtUtc persistido, mas melhora)
                orderBy: { createdAt: 'desc' },
                take: SCAN_LIMIT,
            });

            if (!rituals.length) return;

            // 2) Busca tokens de push em batch (elimina N+1)
            const userIds = [...new Set(rituals.map((r) => r.userId))];

            const devices = await prisma.pushDevice.findMany({
                where: { userId: { in: userIds }, disabled: false },
                select: { userId: true, token: true },
            });

            // Agrupa tokens por usuário
            const tokensByUser = devices.reduce((acc, d) => {
                (acc[d.userId] ??= []).push(d.token);
                return acc;
            }, {} as Record<string, string[]>);

            const nowUtc = DateTime.utc();
            const lower = nowUtc.minus({ minutes: WINDOW_MINUTES }).toJSDate();
            const upper = nowUtc.plus({ minutes: 1 }).toJSDate();

            let matched = 0;
            let pushesAttempted = 0;

            for (const r of rituals) {
                const tz = r.user.timezone || 'UTC';

                const reminderUtc = getReminderUtcForRitual({
                    localDate: r.localDate,
                    userTimezone: tz,
                    checkInHour: r.user.checkInHour,
                    checkInMinute: r.user.checkInMinute,
                });

                if (reminderUtc < lower || reminderUtc > upper) continue;

                // Evita reenvio repetido dentro do TTL
                if (sentCache.has(r.id)) continue;

                matched++;

                const message = buildReminderMessage({
                    displayName: r.user.displayName ?? undefined,
                    title: r.title,
                    localDate: r.localDate,
                    timezone: tz,
                });

                // 1) Socket.IO (app aberto)
                emit(app, userRoom(r.userId), 'ritual:reminder', {
                    ritualId: r.id,
                    title: r.title,
                    message,
                    data: { type: 'RITUAL_REMINDER', ritualId: r.id, deepLink: `whisper://ritual/${r.id}` },
                });

                // 2) Push (app fechado/background)
                const rawTokens = tokensByUser[r.userId] ?? [];
                const tokens = [...new Set(rawTokens)].filter((t) => isValidExpoToken(t));

                if (tokens.length === 0) {
                    app.log.warn(
                        { ritualId: r.id, userId: r.userId, rawTokensCount: rawTokens.length },
                        'no-valid-push-tokens'
                    );
                    // marca como enviado para evitar spam de log em cada tick
                    sentCache.set(r.id, Date.now());
                    continue;
                }

                pushesAttempted++;

                app.log.info(
                    {
                        ritualId: r.id,
                        userId: r.userId,
                        tz,
                        localDate: r.localDate,
                        reminderUtc: reminderUtc.toISOString?.() ?? reminderUtc,
                        tokensCount: tokens.length,
                        tokenSample: tokens[0]?.slice(-10),
                    },
                    'sending-expo-push'
                );

                try {
                    const expoResult = await sendExpoPush(tokens, {
                        title: 'Lembrete do seu ritual',
                        body: message,
                        data: { type: 'RITUAL_REMINDER', ritualId: r.id, deepLink: `whisper://ritual/${r.id}` },
                    });

                    app.log.info(
                        {
                            ritualId: r.id,
                            userId: r.userId,
                            tokensCount: tokens.length,
                            success: expoResult?.success,
                            failure: expoResult?.failure,
                            // Só loga se existir (caso você implemente receipts/ticketErrors)
                            ticketErrors: (expoResult as any)?.ticketErrors,
                            receiptErrors: (expoResult as any)?.receiptErrors,
                        },
                        'ritual-reminder-push-result'
                    );

                    // Marca como enviado (cache) mesmo que tenha falhado parcialmente;
                    // você pode mudar essa lógica se quiser retry agressivo.
                    sentCache.set(r.id, Date.now());
                } catch (err) {
                    app.log.error({ err, ritualId: r.id, userId: r.userId }, 'expo-push-send-failed');
                    // Evita loop infinito batendo no mesmo ritual a cada minuto em caso de erro constante
                    sentCache.set(r.id, Date.now());
                }
            }

            app.log.info(
                {
                    scanned: rituals.length,
                    usersInBatch: userIds.length,
                    devicesInBatch: devices.length,
                    matched,
                    pushesAttempted,
                    durationMs: Date.now() - tickStartMs,
                },
                'ritual-reminder-tick-finished'
            );
        } catch (err) {
            app.log.error({ err }, 'ritual-reminder-tick-failed');
        } finally {
            running = false;
        }
    };

    const schedule = () => {
        void tick(); // roda logo ao iniciar
        timer = setInterval(() => void tick(), INTERVAL_MS);
    };

    schedule();

    // limpa o setInterval no shutdown do Fastify
    app.addHook('onClose', async () => {
        if (timer) clearInterval(timer);
        timer = null;
        (global as any)._ritualReminderStarted = false;
        sentCache.clear();
    });
}
