import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushErrorTicket } from 'expo-server-sdk';
import { prisma } from '../../core/config/prisma';

const expo = new Expo();

const TOKEN_INVALID_ERRORS = new Set([
  'DeviceNotRegistered',
  'InvalidPushToken',
  'MalformedPushToken',
]);

export function isValidExpoToken(token: string) {
  return Expo.isExpoPushToken(token);
}

export async function sendExpoPush(tokens: string[], payload: { title: string; body: string; data?: Record<string, any>; sound?: 'default' | null; priority?: 'default' | 'normal' | 'high'; }) {
  if (!tokens.length) return { success: 0, failure: 0, ticketErrors: [], receiptErrors: [] };

  // 0) Filtra tokens inválidos localmente
  const validTokens = tokens.filter((t) => Expo.isExpoPushToken(t));
  const invalidLocal = tokens.filter((t) => !Expo.isExpoPushToken(t));
  if (invalidLocal.length) {
    await prisma.pushDevice.updateMany({ where: { token: { in: invalidLocal } }, data: { disabled: true } });
  }

  if (!validTokens.length) return { success: 0, failure: 0, ticketErrors: [], receiptErrors: [] };

  const messages: ExpoPushMessage[] = validTokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: payload.sound ?? 'default',
    priority: payload.priority ?? 'high',
  }));

  // 1) Envio em chunks
  const chunks = expo.chunkPushNotifications(messages);
  let tickets: ExpoPushTicket[] = [];
  for (const chunk of chunks) {
    try {
      const res = await expo.sendPushNotificationsAsync(chunk);
      tickets = tickets.concat(res);
    } catch {
      tickets = tickets.concat(chunk.map(() => ({ status: 'error', message: 'chunk_send_failed' } as any)));
    }
  }

  // 2) Trata erros de ticket
  const ticketErrors: Array<{ tokenSuffix: string; message?: string; error?: string }> = [];
  const tokensToDisable: string[] = [];
  const receiptIds: string[] = [];

  tickets.forEach((t, i) => {
    const token = validTokens[i];
    const tokenSuffix = token?.slice(-10) ?? 'unknown';

    if (t.status === 'ok') {
      // @ts-ignore
      if (t.id) receiptIds.push((t as any).id);
      return;
    }

    const et = t as ExpoPushErrorTicket;
    const err = et.details?.error;

    ticketErrors.push({ tokenSuffix, message: et.message, error: err });

    // Só desabilita quando for realmente token inválido
    if (err && TOKEN_INVALID_ERRORS.has(err)) tokensToDisable.push(token);
  });

  if (tokensToDisable.length) {
    await prisma.pushDevice.updateMany({ where: { token: { in: tokensToDisable } }, data: { disabled: true } });
  }

  // 3) Busca receipts (resultado real)
  const receiptErrors: Array<{ id: string; error?: string; message?: string; details?: any }> = [];
  const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

  for (const idChunk of receiptIdChunks) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(idChunk);
      for (const [id, receipt] of Object.entries(receipts)) {
        if (receipt.status === 'error') {
          // @ts-ignore
          receiptErrors.push({ id, error: receipt.details?.error, message: receipt.message, details: receipt.details });
        }
      }
    } catch {
      // Se falhar receipt fetch, você ainda quer registrar isso em log no caller
      receiptErrors.push({ id: 'receipt_fetch_failed', message: 'receipt_fetch_failed' });
    }
  }

  const success = tickets.filter((t) => t.status === 'ok').length;
  const failure = tickets.length - success;

  return { success, failure, ticketErrors, receiptErrors };
}
