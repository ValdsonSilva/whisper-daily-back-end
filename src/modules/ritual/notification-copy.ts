// src/modules/rituals/notification-copy.ts
import { DateTime } from 'luxon';

export function buildReminderMessage(params: {
    displayName?: string;
    title: string;
    localDate: Date;
    timezone: string;
}) {
    const { displayName, title, localDate, timezone } = params;
    const dateStr = DateTime.fromJSDate(localDate, { zone: timezone }).toFormat('dd/LL');
    const prefix = displayName ? `${displayName}, ` : '';
    return `${prefix}hora de revisar seu ritual de ${dateStr}: "${title}". Marque se concluiu ou não.`;
}
