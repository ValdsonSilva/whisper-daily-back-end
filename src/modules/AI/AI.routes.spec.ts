// src/modules/ia-module/AI.routes.spec.ts
import Fastify, { FastifyInstance } from 'fastify';
import { whisperRoutes } from './AI.routes'; // ajuste o nome/export se for diferente
import { WhisperService } from '../AI/whisper.service';

// Mock do serviço de IA
jest.mock('../AI/whisper.service');

const mockedWhisperService = WhisperService as jest.Mocked<typeof WhisperService>;

describe('Whisper AI Routes', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = Fastify();
        // registra as rotas da IA
        await app.register(whisperRoutes); // ou whisperRoutes, conforme o seu arquivo
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ---------- Caso feliz: mensagem normal ----------
    test('POST /ai/whisper/reply deve retornar 200 com a resposta da IA', async () => {
        mockedWhisperService.generateReply.mockResolvedValueOnce({
            reply: 'Que bom te ver por aqui, como você está chegando neste momento?',
            safetyMode: false,
        });

        const res = await app.inject({
            method: 'POST',
            path: '/ai/whisper/reply',
            payload: {
                message: 'Oi, hoje acordei meio cansado.',
                mode: 'morning',
                context: {
                    currentIntention: 'ser mais gentil comigo mesmo',
                    streakDays: 3,
                },
            },
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();

        expect(body).toHaveProperty('reply');
        expect(body).toHaveProperty('safetyMode', false);
        expect(mockedWhisperService.generateReply).toHaveBeenCalledTimes(1);
        expect(mockedWhisperService.generateReply).toHaveBeenCalledWith({
            message: 'Oi, hoje acordei meio cansado.',
            mode: 'morning',
            context: {
                currentIntention: 'ser mais gentil comigo mesmo',
                streakDays: 3,
            },
        });
    });

    // ---------- Validação básica: mensagem obrigatória ----------
    test('POST /ai/whisper/reply deve retornar 400 se "message" não for enviado', async () => {
        const res = await app.inject({
            method: 'POST',
            path: '/ai/whisper/reply',
            payload: {
                // sem "message"
                mode: 'night',
            },
        });

        expect(res.statusCode).toBe(400);
        const body = res.json();
        expect(body).toHaveProperty('message', 'message is required');
        expect(mockedWhisperService.generateReply).not.toHaveBeenCalled();
    });

    // ---------- Propagação do safetyMode (ex.: crise / auto-lesão) ----------
    test('POST /ai/whisper/reply deve retornar 200 e safetyMode=true quando serviço entrar em modo de segurança', async () => {
        mockedWhisperService.generateReply.mockResolvedValueOnce({
            reply:
                'Sinto muito que você esteja se sentindo assim. Eu sou apenas uma IA e não consigo te proteger de verdade. ' +
                'Se puder, procure alguém de confiança ou um serviço de emergência da sua região.',
            safetyMode: true,
        });

        const res = await app.inject({
            method: 'POST',
            path: '/ai/whisper/reply',
            payload: {
                message: 'Hoje eu só penso em me machucar, não aguento mais.',
                mode: 'night',
            },
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();

        expect(body).toHaveProperty('reply');
        expect(body).toHaveProperty('safetyMode', true);
        expect(mockedWhisperService.generateReply).toHaveBeenCalledTimes(1);
    });

    // ---------- Erro interno no serviço (ex.: falha na HF) ----------
    test('POST /ai/whisper/reply deve retornar 500 se o WhisperService gerar erro', async () => {
        mockedWhisperService.generateReply.mockRejectedValueOnce(
            new Error('HuggingFace request failed with status 500'),
        );

        const res = await app.inject({
            method: 'POST',
            path: '/ai/whisper/reply',
            payload: {
                message: 'Só testando aqui.',
            },
        });

        expect(res.statusCode).toBe(500);
        const body = res.json();
        expect(body).toHaveProperty('message', 'Erro ao gerar resposta da Whisper');
        expect(mockedWhisperService.generateReply).toHaveBeenCalledTimes(1);
    });
});
