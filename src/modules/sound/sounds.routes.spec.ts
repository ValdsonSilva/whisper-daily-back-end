// tests/sound.routes.spec.ts
import Fastify, { FastifyInstance } from "fastify";
import { SoundController } from "./sound.controller";
import { SoundRepo } from "./sound.repo";
import { soundRoutes } from "./sound.routes";
import type { AmbientSound } from '@prisma/client';
jest.mock("./sound.repo");

// Helper pra acessar os mocks com type any e não brigar com o TS
const mockedSoundRepo = SoundRepo as jest.Mocked<typeof SoundRepo>;

describe("Sound routes", () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = Fastify();
        app.register(soundRoutes);
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // GET /sounds
    test("GET /sounds - deve retornar lista de sons (200)", async () => {
        const fakeSound = [{ id: "1", key: "teste", title: "Chuva", url: "https://example.com/chuva.mp3", active: false } as AmbientSound];

        mockedSoundRepo.listAllSounds.mockResolvedValue(fakeSound);

        const response = await app.inject({
            method: "GET",
            url: "/sounds",
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body).toHaveProperty("sounds");
        expect(body.sounds).toHaveLength(1);
        expect(body.sounds[0].id).toBe("1");
    });

    test("GET /sounds - deve retornar 404 se não houver sons", async () => {
        mockedSoundRepo.listAllSounds.mockResolvedValue([]);

        const response = await app.inject({
            method: "GET",
            url: "/sounds",
        });

        expect(response.statusCode).toBe(404);
        const body = response.json();
        expect(body.message).toBe("Sons não encontrados");
    });

    // GET /sounds/:id
    test("GET /sounds/:id - deve retornar um som (200)", async () => {
        mockedSoundRepo.listSoundByUserId.mockResolvedValue({
            id: "1",
            title: "Chuva",
            url: "https://example.com/chuva.mp3",
        } as AmbientSound);

        const response = await app.inject({
            method: "GET",
            url: "/sounds/1",
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body).toHaveProperty("sound");
        expect(body.sound.id).toBe("1");
    });

    test("GET /sounds/:id - deve retornar 404 se som não existir", async () => {
        mockedSoundRepo.listSoundByUserId.mockResolvedValue(null);

        const response = await app.inject({
            method: "GET",
            url: "/sounds/999",
        });

        expect(response.statusCode).toBe(404);
        const body = response.json();
        expect(body.message).toBe("Som não encontrado");
    });

    // POST /sounds
    test("POST /sounds - deve criar um som (201)", async () => {
        const payload = {
            key: "test key",
            title: "Floresta",
            url: "https://example.com/floresta.mp3",
        };

        mockedSoundRepo.createSound.mockResolvedValue({
            id: "1",
            ...payload,
        } as AmbientSound);

        const response = await app.inject({
            method: "POST",
            url: "/sounds",
            payload,
        });

        expect(response.statusCode).toBe(201);
        const body = response.json();
        expect(body).toHaveProperty("sound");
        expect(body.sound.title).toBe("Floresta");
        expect(mockedSoundRepo.createSound).toHaveBeenCalledWith(payload);
    });

    // PUT /sounds/:id
    test("PUT /sounds/:id - deve atualizar um som (200)", async () => {
        const payload = {
            title: "Floresta Atualizada",
        };

        mockedSoundRepo.updateSound.mockResolvedValue({
            id: "1",
            title: "Floresta Atualizada",
            url: "https://example.com/floresta.mp3",
        } as AmbientSound);

        const response = await app.inject({
            method: "PUT",
            url: "/sounds/1",
            payload,
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body).toHaveProperty("sound");
        expect(body.sound.title).toBe("Floresta Atualizada");
        expect(mockedSoundRepo.updateSound).toHaveBeenCalledWith("1", payload);
    });

    test("PUT /sounds/:id - deve retornar 404 se som não existir", async () => {
        mockedSoundRepo.updateSound.mockResolvedValue(null);

        const response = await app.inject({
            method: "PUT",
            url: "/sounds/999",
            payload: { name: "Teste" },
        });

        expect(response.statusCode).toBe(404);
        const body = response.json();
        expect(body.message).toBe("Som não encontrado para atualização");
    });

    // DELETE /sounds/:id
    test("DELETE /sounds/:id - deve excluir um som (200)", async () => {


        mockedSoundRepo.deleteSound.mockResolvedValue({
            id: "1"
        } as any);

        const response = await app.inject({
            method: "DELETE",
            url: "/sounds/1",
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.message).toBe("Som excluído com sucesso");
        expect(mockedSoundRepo.deleteSound).toHaveBeenCalledWith("1");
    });

    test("DELETE /sounds/:id - deve retornar 404 se som não existir", async () => {
        mockedSoundRepo.deleteSound.mockResolvedValue(null);

        const response = await app.inject({
            method: "DELETE",
            url: "/sounds/999",
        });

        expect(response.statusCode).toBe(404);
        const body = response.json();
        expect(body.message).toBe("Som não encontrado para exclusão");
    });
});
