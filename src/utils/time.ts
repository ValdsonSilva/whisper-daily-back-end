// src/utils/time.ts
import { DateTime } from 'luxon';

/**
 * Dado o localDate (date-only) do ritual e as prefs do usuário,
 * retorna o DateTime do LEMBRETE em UTC.
 */
export function getReminderUtcForRitual(params: {
    localDate: Date;              // campo RitualDay.localDate (date-only)
    userTimezone: string;         // ex.: "America/Fortaleza"
    checkInHour: number;          // 0..23
    checkInMinute: number;        // 0..59
}): Date {
    const { localDate, userTimezone, checkInHour, checkInMinute } = params;

    // localDate vem como Date UTC representando YYYY-MM-DD (sem hora).
    const yyyyMmDd = localDate.toISOString().slice(0, 10);

    // Monta o horário local de lembrete (no dia do ritual, no fuso do usuário)
    const localReminder = DateTime
        .fromISO(yyyyMmDd, { zone: userTimezone || 'UTC' })
        .startOf('day')
        .set({ hour: checkInHour, minute: checkInMinute, second: 0, millisecond: 0 });

    return localReminder.toUTC().toJSDate();
}
