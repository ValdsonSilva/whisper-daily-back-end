// src/modules/rituals/ritual-reminder.service.ts
import type { FastifyInstance } from 'fastify';
import { DateTime } from 'luxon';
import { getReminderUtcForRitual } from '../../utils/time';
import { emit, userRoom } from '../../utils/realtime';
import { prisma } from '../../core/config/prisma';
import { buildReminderMessage } from './notification-copy';
import { sendExpoPush } from '../../core/config/expo';

const INTERVAL_MS = 60_000; // 1 min
const SCAN_LIMIT = 200;     // reduza o batch
const WINDOW_MINUTES = 5;

let timer: NodeJS.Timeout | null = null;
let running = false;

export function startRitualReminderService(app: FastifyInstance) {
    // impede múltiplas inicializações em dev (ts-node-dev/nodemon)
    if ((global as any)._ritualReminderStarted) {
        app.log.info('ritual-reminder already started; skipping');
        return;
    }
    (global as any)._ritualReminderStarted = true;

    const tick = async () => {
        if (running) return;  // evita sobreposição
        running = true;
        try {
            const rituals = await prisma.ritualDay.findMany({
                where: { status: 'PLANNED', achieved: null, checkInAt: null },
                include: { user: { select: { id: true, displayName: true, timezone: true, checkInHour: true, checkInMinute: true } } },
                orderBy: { createdAt: 'asc' },
                take: SCAN_LIMIT,
            });

            if (!rituals.length) return;

            const nowUtc = DateTime.utc();
            const lower = nowUtc.minus({ minutes: WINDOW_MINUTES }).toJSDate();
            const upper = nowUtc.plus({ minutes: 1 }).toJSDate();

            for (const r of rituals) {
                const tz = r.user.timezone || 'UTC';
                const reminderUtc = getReminderUtcForRitual({
                    localDate: r.localDate, userTimezone: tz,
                    checkInHour: r.user.checkInHour, checkInMinute: r.user.checkInMinute,
                });

                if (reminderUtc >= lower && reminderUtc <= upper) {
                    // emit(app, userRoom(r.userId), 'ritual:reminder', {
                    //     ritualId: r.id, title: r.title, reminderAt: reminderUtc,
                    // });

                    const message = buildReminderMessage({
                        displayName: r.user.displayName ?? undefined,
                        title: r.title,
                        localDate: r.localDate,
                        timezone: tz
                    });

                    // 1) Socket.IO (app aberto)
                    emit(app, userRoom(r.userId), 'ritual:reminder', {
                        ritualId: r.id,
                        title: r.title,
                        message,
                        // dados úteis para a UI
                        data: { type: 'RITUAL_REMINDER', ritualId: r.id, deepLink: `whisper://ritual/${r.id}` },
                    });

                    // 2) Expo Push (app fechado/background)
                    const devices = await prisma.pushDevice.findMany({
                        where: { userId: r.userId, disabled: false },
                        select: { token: true },
                    });

                    const tokens = devices.map((d) => d.token);

                    if (tokens.length === 0) {
                        app.log.warn({ ritualId: r.id, userId: r.userId }, 'no-push-tokens');
                        continue;
                    }

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

                    const expoResult = await sendExpoPush(tokens, {
                        title: 'Lembrete do seu ritual',
                        body: message,
                        data: { type: 'RITUAL_REMINDER', ritualId: r.id, deepLink: `whisper://ritual/${r.id}` },
                    });

                    app.log.info({ ritualId: r.id, expoResult }, 'expo-push-result');
                }
            }
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
    });
}
