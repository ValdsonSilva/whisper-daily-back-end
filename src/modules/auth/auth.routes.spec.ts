import Fastify from "fastify";
import { FastifyInstance } from "fastify";
import { registerAnonymousRoutes } from "./auth.controller";
import { prisma } from "../../core/config/prisma";

// mock do prisma (runtime)
jest.mock("../../core/config/prisma", () => ({
  prisma: {
    user: {
      create: jest.fn(),
    },
  },
}));

describe("Auth Routes - Anonymous", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await app.register(registerAnonymousRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  test("POST /auth/anonymous should create anonymous user and return token (201)", async () => {
    const fakeUser = {
      id: "user-123",
      isAnonymous: true,
      timezone: "America/Fortaleza",
    };

    const createMock = prisma.user.create as unknown as jest.Mock;
    createMock.mockResolvedValueOnce(fakeUser);

    const res = await app.inject({
      method: "POST",
      path: "/auth/anonymous",
      payload: { timeZone: "America/Fortaleza" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();

    expect(body).toHaveProperty("userId", "user-123");
    expect(body).toHaveProperty("token");
    expect(typeof body.token).toBe("string");

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      data: { timezone: "America/Fortaleza" },
    });
  });

  test("POST /auth/anonymous should return 400 if timeZone is missing", async () => {
    const res = await app.inject({
      method: "POST",
      path: "/auth/anonymous",
      payload: {}, // sem timeZone
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();

    expect(body).toHaveProperty("message", "Informe o timeZone");
  });

  test("POST /auth/anonymous should return 500 if user creation fails", async () => {
    const createMock = prisma.user.create as unknown as jest.Mock;
    createMock.mockRejectedValueOnce(new Error("DB error"));

    const res = await app.inject({
      method: "POST",
      path: "/auth/anonymous",
      payload: { timeZone: "America/Fortaleza" },
    });

    expect(res.statusCode).toBe(500);
    const body = res.json();

    expect(body).toHaveProperty(
      "message",
      "Erro ao criar usuário anônimo"
    );
  });
});
