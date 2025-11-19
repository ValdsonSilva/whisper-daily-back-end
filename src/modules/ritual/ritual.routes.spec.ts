// tests/ritual.routes.spec.ts
import Fastify from "fastify";
import { RitualController } from "./ritual.controller";
import { RitualRepo } from "./ritual.repo";
import { ritualRoutes } from "./ritual.routes";
import { describe } from "node:test";
import zodValidator from "../../core/http/plugins/zodValidator";
import { RitualDay } from "@prisma/client";

jest.mock('./ritual.repo');

var mockedRitualRepo = RitualRepo as jest.Mocked<typeof RitualRepo>;

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
    })

    // ---------- Test for GET /rituals ----------
    test("GET /rituals should list all rituals from the user (200)", async () => {
        const fakeRituals = [{ id: "1", title: "Devo rezar o rosário" } as RitualDay];

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
        const fakeRitual = { id: "1", title: "Devo rezar o rosário" } as RitualDay;

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
        const createdRitual = { id: "1", ...newRitual } as RitualDay;

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
        const updatedRitual = { id: "1", title: "Ler um livro - Atualizado", note: "Uma hora de leitura" } as RitualDay;

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

        mockedRitualRepo.delete.mockResolvedValueOnce(deletedRitual as RitualDay);

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
        const checkInData = { achieved: true, aiReply: "Boa", microStep: "Passo 1" };
        const checkInRitual = { id: "1", title: "Ler um livro", achieved: true } as RitualDay;

        mockedRitualRepo.registerCheckIn.mockResolvedValueOnce(checkInRitual);

        const res = await app.inject({
            path: "/rituals/1/checkin",
            method: "POST",
            payload: checkInData
        })

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body).toHaveProperty("ritual");
        expect(body.ritual.id).toBe("1");
        expect(body.ritual.achieved).toBe(true);
    });

    // ---------- Test for POST /rituals/upsert ----------
    test("POST /rituals/upsert should create or update ritual (200)", async () => {
        const ritualData = { userId: "user1", localDate: new Date(), title: "Manhã de Leitura", note: "Leitura de 30 minutos" };

        mockedRitualRepo.upsertMorning.mockResolvedValueOnce({ id: "1", ...ritualData } as RitualDay);

        const res = await app.inject({
            path: "/rituals/upsert",
            method: "POST",
            payload: ritualData
        })

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body).toHaveProperty("ritual");
        expect(body.ritual.title).toBe("Manhã de Leitura");
    });
})
