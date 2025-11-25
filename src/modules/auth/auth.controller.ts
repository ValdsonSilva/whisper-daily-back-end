// src/modules/auth/auth.controller.ts
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { prisma } from "../../core/config/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

type ITimeZone = {
    timeZone: string
}

export async function registerAnonymousRoutes(app: FastifyInstance) {
    app.post(
        "/auth/anonymous",
        async (req: FastifyRequest<{ Body: ITimeZone }>, reply: FastifyReply) => {
            try {
                // se quiser, pode receber algo como deviceId no body
                const data = req.body;

                if (!data.timeZone) {
                    return reply.status(400).send({ message: "Informe o timeZone" });
                }

                // cria usuário anônimo
                const user = await prisma.user.create({
                    data: {
                        timezone: data.timeZone, // padrão, pode ser atualizado depois
                    }
                });

                const token = jwt.sign(
                    {
                        sub: user.id,
                        isAnonymous: user.isAnonymous,
                    },
                    JWT_SECRET,
                    {
                        expiresIn: "180d", // ou o que você quiser pro MVP
                    }
                );

                return reply.code(201).send({
                    userId: user.id,
                    token,
                });
            } catch (err) {
                req.log.error({ err }, "Erro ao criar usuário anônimo");
                return reply.code(500).send({ message: "Erro ao criar usuário anônimo" });
            }
        }
    );
}
