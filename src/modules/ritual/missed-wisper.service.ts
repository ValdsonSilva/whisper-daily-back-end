// src/modules/rituals/missed-sweeper.service.ts
import type { FastifyInstance } from 'fastify';
import { DateTime } from 'luxon';
import { prisma } from '../../core/config/prisma';

const BATCH_SIZE = 200;           // menor lote = menos pressão no pool
const INTERVAL_MS = 15 * 60_000;  // a cada 15 min

let timer: NodeJS.Timeout | null = null;
let running = false;

/**
 * Marca como MISSED (e pastDue=true) os rituais PLANNED sem resposta
 * cujo prazo (localDate + 24h no fuso do usuário) já venceu.
 */
export function startMissedRitualSweeper(app: FastifyInstance) {
    // evita múltiplas inicializações em dev/hot-reload
    if ((global as any)._missedSweeperStarted) {
        app.log.info('missed-sweeper already started; skipping');
        return;
    }
    (global as any)._missedSweeperStarted = true;

    const tick = async () => {
        if (running) return; // não sobrepor
        running = true;

        try {
            const nowUtc = DateTime.utc();
            let cursor: string | undefined;
            let totalUpdated = 0;
            let totalScanned = 0;

            // paginação por cursor para não travar o pool
            while (true) {
                const rows = await prisma.ritualDay.findMany({
                    where: {
                        status: 'PLANNED',
                        achieved: null,
                        checkInAt: null,
                    },
                    include: {
                        user: { select: { timezone: true } },
                    },
                    orderBy: { id: 'asc' },   // ordena por PK p/ cursor
                    take: BATCH_SIZE + 1,
                    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                });

                if (!rows.length) break;

                const page = rows.slice(0, BATCH_SIZE);
                cursor = rows.length > BATCH_SIZE ? rows[BATCH_SIZE].id : undefined;
                totalScanned += page.length;

                const toMissIds: string[] = [];

                for (const r of page) {
                    const tz = r.user.timezone || 'UTC';
                    // localDate é date-only; reconstruímos o início do dia no fuso do usuário
                    const yyyyMmDd = r.localDate.toISOString().slice(0, 10);
                    const startLocal = DateTime.fromISO(yyyyMmDd, { zone: tz }).startOf('day');
                    const cutoffUtc = startLocal.plus({ days: 1 }).toUTC(); // +24h

                    if (nowUtc >= cutoffUtc) {
                        toMissIds.push(r.id);
                    }
                }

                if (toMissIds.length) {
                    const res = await prisma.ritualDay.updateMany({
                        where: { id: { in: toMissIds } },
                        data: {
                            pastDue: true,
                            status: 'MISSED',
                            achieved: false, // não respondeu => “Não”
                        },
                    });
                    totalUpdated += res.count;
                }

                // se não há próximo cursor, fim da varredura
                if (!cursor) break;
            }

            app.log.info({ scanned: totalScanned, updated: totalUpdated }, 'missed-sweeper-tick-done');
        } catch (err) {
            app.log.error({ err }, 'missed-sweeper-tick-failed');
        } finally {
            running = false;
        }
    };

    // agenda recorrente
    timer = setInterval(() => { void tick(); }, INTERVAL_MS);
    // dispara uma vez ao subir
    void tick();

    // encerra com o servidor
    app.addHook('onClose', async () => {
        if (timer) clearInterval(timer);
        timer = null;
        (global as any)._missedSweeperStarted = false;
    });
}
