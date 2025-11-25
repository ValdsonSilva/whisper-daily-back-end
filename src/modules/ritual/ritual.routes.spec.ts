// tests/ritual.routes.spec.ts
import Fastify from "fastify";
import { RitualRepo } from "./ritual.repo";
import { ritualRoutes } from "./ritual.routes";
import { describe } from "node:test";
import zodValidator from "../../core/http/plugins/zodValidator";
import { WhisperService } from "../AI/whisper.service";

jest.mock('./ritual.repo');
// jest.mock('../AI/whisper.service');

const mockedRitualRepo = RitualRepo as jest.Mocked<typeof RitualRepo>;
// const mockedWhisperService = WhisperService as jest.Mocked<typeof WhisperService>;

describe('Ritual Routes', () => {
    const app = Fastify();

    beforeAll(async () => {
        await app.register(ritualRoutes);
        await app.register(zodValidator);
        await app.ready();
    })

    afterAll(async () => {
        await app.close();
    })

    beforeEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    })

    // ---------- Test for GET /rituals ----------
    test("GET /rituals should list all rituals from the user (200)", async () => {
        const fakeRituals = [{ id: "1", title: "Devo rezar o rosário" } as any];

        mockedRitualRepo.listByUser.mockResolvedValueOnce(fakeRituals);

        const res = await app.inject({
            path: "/rituals",
            method: "GET"
        })

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body).toHaveProperty("rituals");
        expect(body.rituals).toHaveLength(1);
        expect(body.rituals[0].id).toBe("1")
    });

    test("GET /rituals should return 404 when no rituals are found", async () => {
        mockedRitualRepo.listByUser.mockResolvedValueOnce([]);

        const res = await app.inject({
            path: "/rituals",
            method: "GET"
        })

        expect(res.statusCode).toBe(404);
        const body = res.json();
        expect(body).toHaveProperty("message", "Rituais não encontrados");
    })

    // ---------- Test for GET /rituals/:id ----------
    test("GET /rituals/:id should return a ritual (200)", async () => {
        const fakeRitual = { id: "1", title: "Devo rezar o rosário" } as any;

        mockedRitualRepo.findById.mockResolvedValueOnce(fakeRitual);

        const res = await app.inject({
            path: "/rituals/1",
            method: "GET"
        })

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body).toHaveProperty("ritual");
        expect(body.ritual.id).toBe("1");
    });

    test("GET /rituals/:id should return 404 when ritual is not found", async () => {
        mockedRitualRepo.findById.mockResolvedValueOnce(null);

        const res = await app.inject({
            path: "/rituals/999",
            method: "GET"
        })

        expect(res.statusCode).toBe(404);
        const body = res.json();
        expect(body).toHaveProperty("message", "Ritual não encontrado");
    })

    // ---------- Test for POST /rituals ----------
    test("POST /rituals should create a ritual (201)", async () => {
        const newRitual = { title: "Ler um livro", note: "Uma hora de leitura" };
        const createdRitual = { id: "1", ...newRitual } as any;

        mockedRitualRepo.create.mockResolvedValueOnce(createdRitual);

        const res = await app.inject({
            path: "/rituals",
            method: "POST",
            payload: newRitual
        })

        expect(res.statusCode).toBe(201);
        const body = res.json();
        expect(body).toHaveProperty("ritual");
        expect(body.ritual.title).toBe("Ler um livro");
    });

    // ---------- Test for PUT /rituals/:id ----------
    test("PUT /rituals/:id should update a ritual (200)", async () => {
        const updateData = { title: "Ler um livro - Atualizado" };
        const updatedRitual = { id: "1", title: "Ler um livro - Atualizado", note: "Uma hora de leitura" } as any;

        mockedRitualRepo.update.mockResolvedValueOnce(updatedRitual);

        const res = await app.inject({
            path: "/rituals/1",
            method: "PUT",
            payload: updateData
        })

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body).toHaveProperty("ritual");
        expect(body.ritual.title).toBe("Ler um livro - Atualizado");
    });

    test("PUT /rituals/:id should return 500 when update fails", async () => {
        mockedRitualRepo.update.mockRejectedValueOnce(new Error("Error"));

        const res = await app.inject({
            path: "/rituals/1",
            method: "PUT",
            payload: { title: "Ler um livro" }
        })

        expect(res.statusCode).toBe(500);
        const body = res.json();
        expect(body).toHaveProperty("message", "Erro ao atualizar ritual");
    })

    // ---------- Test for DELETE /rituals/:id ----------
    test("DELETE /rituals/:id should delete a ritual (200)", async () => {
        const deletedRitual = { id: "1", title: "Ler um livro", note: "Uma hora de leitura", localDate: new Date() };

        mockedRitualRepo.delete.mockResolvedValueOnce(deletedRitual as any);

        const res = await app.inject({
            path: "/rituals/1",
            method: "DELETE"
        })
        const body = res.json();
        expect(body).toHaveProperty("message", "Ritual excluído com sucesso");
        expect(res.statusCode).toBe(200);
        expect(body).toHaveProperty("ritual");
        expect(mockedRitualRepo.delete).toHaveBeenLastCalledWith("1");
    });

    test("DELETE /rituals/:id should return 404 when ritual not found", async () => {
        mockedRitualRepo.delete.mockResolvedValueOnce(null as any);

        const res = await app.inject({
            path: "/rituals/999",
            method: "DELETE"
        })

        expect(res.statusCode).toBe(404);
        const body = res.json();
        expect(body).toHaveProperty("message", "Ritual não encontrado para exclusão");
    })

    // ---------- Test for POST /rituals/:id/checkin ----------
    test("POST /rituals/:id/checkin should register check-in (200)", async () => {
        // ritual que já existe para o usuário
        const existingRitual = {
            id: "1",
            userId: "1",
            title: "Ler um livro",
            note: "Leitura de 30 minutos",
        } as any;

        // 1) listByUser retorna um ritual pra esse userId
        mockedRitualRepo.listByUser.mockResolvedValueOnce([existingRitual]);

        // 2) IA responde algo
        const whisperSpy = jest
            .spyOn(WhisperService, 'generateReply')
            .mockResolvedValueOnce({
                reply: "Parabéns pela conquista! Como se sentiu ao terminar a tarefa?",
                safetyMode: false,
            });

        // 3) registerCheckIn salva/retorna o ritual atualizado
        const updatedRitual = {
            ...existingRitual,
            achieved: true,
            aiReply: "Parabéns pela conquista! Como se sentiu ao terminar a tarefa?",
        } as any;

        mockedRitualRepo.registerCheckIn.mockResolvedValueOnce(updatedRitual);

        // 4) chamada à rota (body só com achieved, como o controller espera)
        const res = await app.inject({
            path: "/rituals/1/checkin",
            method: "POST",
            payload: { achieved: true },
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();

        // 5) checa resposta
        expect(body).toHaveProperty("ritual");
        expect(body.ritual.id).toBe("1");
        expect(body.ritual.achieved).toBe(true);
        expect(body.ritual.aiReply).toBe("Parabéns pela conquista! Como se sentiu ao terminar a tarefa?");

        // console.log(body)
        // console.log("Calls to listByUser:", mockedRitualRepo.listByUser.mock.calls);


        // 6) checa se chamamos as dependências certo
        expect(mockedRitualRepo.listByUser).toHaveBeenCalledWith("1");
        expect(whisperSpy).toHaveBeenCalledTimes(1);
        expect(mockedRitualRepo.registerCheckIn).toHaveBeenCalledTimes(1);
        expect(mockedRitualRepo.registerCheckIn).toHaveBeenLastCalledWith(
            "1",
            expect.any(Date),
            { achieved: true, aiReply: "Parabéns pela conquista! Como se sentiu ao terminar a tarefa?" }
        );

        whisperSpy.mockRestore(); // limpa o spy pra não vazar pra outros testes
    });

    // ---------- Test for POST /rituals/:id/checkin ----------
    test("POST /rituals/:id/checkin should return 404 if ritual is not found", async () => {
        const checkInData = { achieved: true, aiReply: "Boa", microStep: "Passo 1" };

        mockedRitualRepo.listByUser.mockResolvedValueOnce([]);  // Mock para retornar null, simulando que o ritual não existe

        const res = await app.inject({
            path: "/rituals/1/checkin",
            method: "POST",
            payload: checkInData,
        });

        expect(res.statusCode).toBe(404);
        const body = res.json();
        expect(body).toHaveProperty("message", "Ritual não encontrado");
    });

    test("POST /rituals/:id/checkin should return 200 with safetyMode=true when message is sensitive", async () => {
        const checkInData = { achieved: false, aiReply: "Não consegui hoje", microStep: "Passo 2" };
        const checkInRitual = {
            id: "1",
            userId: "1",
            title: "Ler um livro",
            note: "Não tenho mais forças",
            achieved: false,
        } as any;

        const expectedReply =
            "Sinto muito que você esteja se sentindo assim, isso é realmente pesado. Por favor, procure ajuda.";

        // 1) o controller usa listByUser(id), então precisamos mockar listByUser:
        mockedRitualRepo.listByUser.mockResolvedValueOnce([checkInRitual]);

        // 2) IA em modo segurança
        const spy = jest
            .spyOn(WhisperService, "generateReply")
            .mockResolvedValueOnce({
                reply: expectedReply,
                safetyMode: true,
            });

        // 3) registerCheckIn devolve o ritual já com aiReply
        mockedRitualRepo.registerCheckIn.mockResolvedValueOnce({
            ...checkInRitual,
            achieved: false,
            aiReply: expectedReply,
        } as any);

        const res = await app.inject({
            path: "/rituals/1/checkin",
            method: "POST",
            payload: checkInData,
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();

        expect(body).toHaveProperty("ritual");
        expect(body.ritual.id).toBe("1");
        expect(body.ritual.aiReply).toBe(expectedReply);
        expect(body.ritual.achieved).toBe(false);

        expect(mockedRitualRepo.listByUser).toHaveBeenCalledWith("1");
        expect(mockedRitualRepo.registerCheckIn).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledTimes(1);

        spy.mockRestore();
    });


    test("POST /rituals/upsert should create or update ritual (200)", async () => {
        const ritualData = {
            userId: "user1",
            localDate: new Date(),
            title: "Manhã de Leitura",
            note: "Leitura de 30 minutos",
            subtasks: [{ content: "Abrir o livro" }, { content: "Ler 10 páginas" }],
        };

        const expectedReply =
            "Que bom que você se dedicou à leitura hoje! Como você se sentiu?";

        // IA respondendo algo específico para ESTE teste
        const spy = jest
            .spyOn(WhisperService, "generateReply")
            .mockResolvedValueOnce({
                reply: expectedReply,
                safetyMode: false,
            });

        // upsertMorning devolve o ritual salvo
        mockedRitualRepo.upsertMorning.mockResolvedValueOnce({
            id: "1",
            ...ritualData,
        } as any);

        const res = await app.inject({
            path: "/rituals/upsert",
            method: "POST",
            payload: ritualData,
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();

        expect(body).toHaveProperty("ritual");
        expect(body.ritual.title).toBe("Manhã de Leitura");

        // aiReply vem fora de ritual, conforme controller
        expect(body).toHaveProperty("aiReply", expectedReply);

        expect(mockedRitualRepo.upsertMorning).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledTimes(1);

        spy.mockRestore(); // importantíssimo pra não vazar pro próximo teste
    });

    // ---------- Test for POST /rituals/upsert ----------
    test("POST /rituals/upsert should return 400 if required parameters are missing", async () => {
        const ritualData = {
            userId: "",
            localDate: new Date(),
            title: "", // faltando
            note: "Leitura de 30 minutos",
            subtasks: ["Abrir o livro", "Ler 10 páginas"],
        };

        const res = await app.inject({
            path: "/rituals/upsert",
            method: "POST",
            payload: ritualData,
        });

        expect(res.statusCode).toBe(400);
        const body = res.json();
        expect(body).toHaveProperty(
            "message",
            "UserId & localDate & title são obrigatórios"
        );

        // não deve chamar IA nem repo
        expect(mockedRitualRepo.upsertMorning).not.toHaveBeenCalled();
    });

    // ---------- Test for POST /rituals/upsert ----------
    test("POST /rituals/upsert should return 500 if AI service fails", async () => {
        const ritualData = {
            userId: "user1",
            localDate: new Date(),
            title: "Manhã de Leitura",
            note: "Leitura de 30 minutos",
            subtasks: ["Abrir o livro", "Ler 10 páginas"],
        };

        // IA "falha" retornando null, disparando o if (!whisperAI)
        const spy = jest
            .spyOn(WhisperService, "generateReply")
            .mockResolvedValueOnce(null as any);

        const res = await app.inject({
            path: "/rituals/upsert",
            method: "POST",
            payload: ritualData,
        });

        expect(res.statusCode).toBe(500);
        const body = res.json();
        expect(body).toHaveProperty("message", "Erro ao gerar resposta da IA");

        // não deve tentar salvar no banco
        expect(mockedRitualRepo.upsertMorning).not.toHaveBeenCalled();
        expect(spy).toHaveBeenCalledTimes(1);

        spy.mockRestore();
    });
})
