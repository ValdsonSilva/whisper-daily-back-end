import Fastify, { FastifyInstance } from "fastify";
import { userRoutes } from "./user.routes";
import { UserRepo } from "./user.repo";
import { describe } from "node:test";
import type { User } from '@prisma/client';
import zodValidator from "../../core/http/plugins/zodValidator";

/**
 * var - escopo global (acessada dentro e fora da classe)
 * let - escopo de bloco/função (acessada apenas no bloco onde declarada)
 * const - escopo global dentro da classe/função (acessada apenas dentro da classe)
*/

jest.mock('./user.repo');

var mockedUserRepo = UserRepo as jest.Mocked<typeof UserRepo>;

describe("User routes", () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = Fastify();
        app.register(zodValidator)
        app.register(userRoutes)
        app.ready();  // Certifique-se de que o app está pronto para receber requisições
    });

    afterAll(async () => {
        app.close();
    });

    // ---------- GET /users ----------
    test("GET /users - deve retornar 200 e lista de usuários", async () => {
        const fakeUsers = [{ id: "1", email: "a@a.com" }] as User[];

        mockedUserRepo.listAllUsers.mockResolvedValueOnce(fakeUsers);

        const res = await app.inject({
            method: "GET",
            url: "/users",
        });

        expect(res.statusCode).toBe(200);

        const body = res.json();
        expect(body).toHaveProperty<User[]>("users");
        expect(body.users).toHaveLength(1);
        expect(body.users[0].id).toBe("1");
    });

    test("GET /users - deve retornar 404 quando não houver usuários", async () => {
        mockedUserRepo.listAllUsers.mockResolvedValueOnce([]);

        const res = await app.inject({
            method: "GET",
            url: "/users",
        });

        expect(res.statusCode).toBe(404);

        const body = res.json();
        expect(body).toHaveProperty("message", "Usuários não encontrados");
    });

    test("GET /users - deve retornar 500 em erro inesperado", async () => {
        mockedUserRepo.listAllUsers.mockRejectedValueOnce(
            new Error("Erro de banco")
        );

        const res = await app.inject({
            method: "GET",
            url: "/users",
        });

        expect(res.statusCode).toBe(500);

        const body = res.json();
        expect(body).toHaveProperty("message", "Erro ao listar usuários");
    });

    // ---------- GET /users/:id ----------
    test("GET /users/:id - deve retornar 200 e o usuário", async () => {
        const fakeUser = { id: "123", email: "b@b.com" } as any;

        mockedUserRepo.listUserById.mockResolvedValueOnce(fakeUser);

        const res = await app.inject({
            method: "GET",
            url: "/users/123",
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body).toHaveProperty("user");
        expect(body.user.id).toBe("123");
    });

    test("GET /users/:id - deve retornar 404 se usuário não existir", async () => {
        mockedUserRepo.listUserById.mockResolvedValueOnce(null);

        const res = await app.inject({
            method: "GET",
            url: "/users/999",
        });

        expect(res.statusCode).toBe(404);

        const body = res.json();
        expect(body).toHaveProperty("message", "Usuário não encontrado");
    });

    test("GET /users/:id - deve retornar 500 em erro inesperado", async () => {
        mockedUserRepo.listUserById.mockRejectedValueOnce(
            new Error("Erro de banco")
        );

        const res = await app.inject({
            method: "GET",
            url: "/users/123",
        });

        expect(res.statusCode).toBe(500);

        const body = res.json();
        expect(body).toHaveProperty("message", "Erro ao buscar usuário");
    });

    // ---------- POST /users ----------
    test("POST /users - deve criar usuário e retornar 201", async () => {
        const payload = {
            email: "novo@user.com",
            timezone: "America/Fortaleza",
        };

        const fakeUser = { id: "abc", ...payload } as any;

        mockedUserRepo.createUser.mockResolvedValueOnce(fakeUser);

        const res = await app.inject({
            method: "POST",
            url: "/users",
            payload,
        });

        expect(res.statusCode).toBe(201);

        const body = res.json();
        expect(body).toHaveProperty("user");
        expect(body.user.id).toBe("abc");
        expect(mockedUserRepo.createUser).toHaveBeenCalledWith(payload);
    });

    test("POST /users - deve retornar 500 em erro inesperado", async () => {
        const payload = {
            email: "erro@user.com",
            timezone: "America/Fortaleza",
        };

        mockedUserRepo.createUser.mockRejectedValueOnce(
            new Error("Erro ao criar")
        );

        const res = await app.inject({
            method: "POST",
            url: "/users",
            payload,
        });

        expect(res.statusCode).toBe(500);

        const body = res.json();
        expect(body).toHaveProperty("message", "Erro ao criar usuário");
    });

    // ---------- PUT /users/:id ----------
    test("PUT /users/:id - deve atualizar usuário e retornar 200", async () => {
        const payload = {
            displayName: "Nome Atualizado",
        };

        const fakeUser = { id: "123", email: "c@c.com", ...payload } as any;

        mockedUserRepo.updateUser.mockResolvedValueOnce(fakeUser);

        const res = await app.inject({
            method: "PUT",
            url: "/users/123",
            payload,
        });

        expect(res.statusCode).toBe(200);

        const body = res.json();
        expect(body).toHaveProperty("user");
        expect(body.user.displayName).toBe("Nome Atualizado");
        expect(mockedUserRepo.updateUser).toHaveBeenCalledWith("123", payload);
    });

    test("PUT /users/:id - deve retornar 500 em erro inesperado", async () => {
        const payload = {
            displayName: "Erro",
        };

        mockedUserRepo.updateUser.mockRejectedValueOnce(
            new Error("Erro ao atualizar")
        );

        const res = await app.inject({
            method: "PUT",
            url: "/users/123",
            payload,
        });

        expect(res.statusCode).toBe(500);

        const body = res.json();
        expect(body).toHaveProperty("message", "Erro ao atualizar usuário");
    });

    // ---------- DELETE /users/:id ----------
    test("DELETE /users/:id - deve excluir usuário e retornar 200", async () => {
        const fakeUser = { id: "123", email: "d@d.com" } as any;

        mockedUserRepo.deleteUser.mockResolvedValueOnce(fakeUser);

        const res = await app.inject({
            method: "DELETE",
            url: "/users/123",
        });

        expect(res.statusCode).toBe(200);

        const body = res.json();
        expect(body).toHaveProperty("message", "Usuário excluído com sucesso");
        expect(body).toHaveProperty("user");
        expect(body.user.id).toBe("123");
        expect(mockedUserRepo.deleteUser).toHaveBeenCalledWith("123");
    });

    test("DELETE /users/:id - deve retornar 500 em erro inesperado", async () => {
        mockedUserRepo.deleteUser.mockRejectedValueOnce(
            new Error("Erro ao excluir")
        );

        const res = await app.inject({
            method: "DELETE",
            url: "/users/123",
        });

        expect(res.statusCode).toBe(500);

        const body = res.json();
        expect(body).toHaveProperty("message", "Erro ao excluir usuário");
    });
});
