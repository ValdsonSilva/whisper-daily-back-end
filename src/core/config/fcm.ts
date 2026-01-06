// src/infra/push/fcm.ts
import * as admin from 'firebase-admin';
import { prisma } from './prisma';

let initialized = false;
export function ensureFcm() {
    if (initialized) return admin.app();
    // Use variáveis de ambiente (service account)
    const projectId = process.env.FIREBASE_PROJECT_ID!;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    initialized = true;
    return admin.app();
}

export type PushPayload = {
    title: string;
    body: string;
    data?: Record<string, string>;   // deep link params
    ttlSeconds?: number;
};

export async function sendPushToTokens(tokens: string[], payload: PushPayload) {
    
    if (!tokens.length) return { success: 0, failure: 0 };
    const app = ensureFcm();
    const messaging = app.messaging();

    // envie em lotes menores para evitar throttling
    const chunkSize = 450; // <500 por batch
    let success = 0, failure = 0;

    for (let i = 0; i < tokens.length; i += chunkSize) {
        const slice = tokens.slice(i, i + chunkSize);
        const res = await messaging.sendEachForMulticast({
            tokens: slice,
            notification: { title: payload.title, body: payload.body },
            data: payload.data,
            android: { ttl: (payload.ttlSeconds ?? 3600) * 1000, priority: 'high' },
            apns: {
                headers: { 'apns-priority': '10' },
                payload: { aps: { sound: 'default', contentAvailable: true } },
            },
            webpush: { headers: { Urgency: 'high' } },
        });

        success += res.successCount;
        failure += res.failureCount;

        // tokens inválidos → desabilite
        const invalidTokens: string[] = [];
        res.responses.forEach((r, idx) => {
            if (!r.success) {
                const code = r.error?.code ?? '';
                if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
                    invalidTokens.push(slice[idx]);
                }
            }
        });
        if (invalidTokens.length) {
            await prisma.pushDevice.updateMany({ where: { token: { in: invalidTokens } }, data: { disabled: true } });
        }
    }

    return { success, failure };
}
