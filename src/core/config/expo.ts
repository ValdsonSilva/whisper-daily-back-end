// src/infra/push/expo.ts
import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushSuccessTicket, ExpoPushErrorTicket } from 'expo-server-sdk';
import { prisma } from '../../core/config/prisma';

const expo = new Expo();

export function isValidExpoToken(token: string) {
  return Expo.isExpoPushToken(token);
}

export async function sendExpoPush(
  tokens: string[],
  payload: {
    title: string;
    body: string;
    data?: Record<string, any>;
    sound?: 'default' | null;
    priority?: 'default' | 'normal' | 'high';
  }
) {
  if (!tokens.length) return { success: 0, failure: 0 };

  const messages: ExpoPushMessage[] = tokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: payload.sound ?? 'default',
    priority: payload.priority ?? 'high',
  }));

  // 1) Quebra em chunks e envia
  const chunks = expo.chunkPushNotifications(messages);
  let tickets: (ExpoPushTicket | undefined)[] = [];
  for (const chunk of chunks) {
    // erros de rede não devem derrubar o job inteiro
    try {
      const res = await expo.sendPushNotificationsAsync(chunk);
      tickets = tickets.concat(res);
    } catch (e) {
      // se falhar o chunk inteiro, marque todos como erro genérico
      tickets = tickets.concat(chunk.map(() => ({ status: 'error', message: 'chunk_send_failed' } as ExpoPushErrorTicket)));
    }
  }

  // 2) Trata tickets (desabilita tokens inválidos)
  const invalid: string[] = [];
  tickets.forEach((t, i) => {
    if (!t) return;
    if (t.status === 'error') {
      const err = (t as ExpoPushErrorTicket).details?.error;
      // Principais erros que indicam token inválido / não registrado
      if (err === 'DeviceNotRegistered' || err === 'InvalidCredentials' || err === 'MessageRateExceeded') {
        invalid.push(tokens[i]);
      }
    }
  });
  if (invalid.length) {
    await prisma.pushDevice.updateMany({ where: { token: { in: invalid } }, data: { disabled: true } });
  }

  const success = tickets.filter((t) => t && t.status === 'ok').length;
  const failure = tickets.length - success;
  return { success, failure };
}
