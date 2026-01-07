import type { FastifyInstance } from 'fastify';
import { DateTime } from 'luxon';
import { prisma } from '../../core/config/prisma';

const BATCH_SIZE = 200;
const INTERVAL_MS = 15 * 60_000; // a cada 15 min

let timer: NodeJS.Timeout | null = null;
let running = false;

/**
 * Marca pastDue=true para rituais COMPLETED que já passaram 24h desde createdAt.
 * Observação: usa createdAt (UTC) como referência.
 */
export function startCompletedPastDueService(app: FastifyInstance) {
    // evita múltiplas inicializações em dev/hot-reload
    if ((global as any)._completedPastDueStarted) {
        app.log.info('completed-pastdue already started; skipping');
        return;
    }
    (global as any)._completedPastDueStarted = true;

    const tick = async () => {
        if (running) return;
        running = true;

        try {
            const nowUtc = DateTime.utc();
            const cutoff = nowUtc.minus({ hours: 24 }).toJSDate();

            let cursor: string | undefined;
            let totalScanned = 0;
            let totalUpdated = 0;

            while (true) {
                const rows = await prisma.ritualDay.findMany({
                    where: {
                        status: 'COMPLETED',
                        // evita reprocessar
                        pastDue: false,
                        // já passou 24h desde criação
                        createdAt: { lte: cutoff },
                    },
                    orderBy: { id: 'asc' },
                    take: BATCH_SIZE + 1,
                    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
                    select: { id: true }, // só precisamos do id
                });

                if (!rows.length) break;

                const page = rows.slice(0, BATCH_SIZE);
                cursor = rows.length > BATCH_SIZE ? rows[BATCH_SIZE].id : undefined;

                totalScanned += page.length;

                const ids = page.map((r) => r.id);
                if (ids.length) {
                    const res = await prisma.ritualDay.updateMany({
                        where: { id: { in: ids }, pastDue: false },
                        data: { pastDue: true },
                    });
                    totalUpdated += res.count;
                }

                if (!cursor) break;
            }

            app.log.info(
                { scanned: totalScanned, updated: totalUpdated, cutoff: cutoff.toISOString() },
                'completed-pastdue-tick-done'
            );
        } catch (err) {
            app.log.error({ err }, 'completed-pastdue-tick-failed');
        } finally {
            running = false;
        }
    };

    timer = setInterval(() => void tick(), INTERVAL_MS);
    void tick();

    app.addHook('onClose', async () => {
        if (timer) clearInterval(timer);
        timer = null;
        (global as any)._completedPastDueStarted = false;
    });
}