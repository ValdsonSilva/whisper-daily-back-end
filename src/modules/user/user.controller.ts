import { FastifyReply, FastifyRequest } from "fastify";
import { UserRepo } from "./user.repo";
import { Prisma } from "@prisma/client";

type IdParams = {
    id: string;
};

export const UserController = {
    // já tinha algo assim, só deixei aqui pra ficar tudo junto
    listAll: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const users = await UserRepo.listAllUsers();

            if (!users || users.length === 0) {
                return reply.code(404).send({ message: "Usuários não encontrados" });
            }

            return reply.code(200).send({ users });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao listar usuários", error });
        }
    },

    listById: async (
        req: FastifyRequest<{ Params: IdParams }>,
        reply: FastifyReply
    ) => {
        try {
            const { id } = req.params;

            const user = await UserRepo.listUserById(id);

            if (!user) {
                return reply.code(404).send({ message: "Usuário não encontrado" });
            }

            return reply.code(200).send({ user });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao buscar usuário", error });
        }
    },

    create: async (
        req: FastifyRequest<{ Body: Prisma.UserCreateInput }>,
        reply: FastifyReply
    ) => {
        try {
            const data = req.body;

            const user = await UserRepo.createUser(data);

            return reply.code(201).send({ user });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao criar usuário", error });
        }
    },

    update: async (
        req: FastifyRequest<{ Params: IdParams; Body: Prisma.UserUpdateInput }>,
        reply: FastifyReply
    ) => {
        try {
            const { id } = req.params;
            const data = req.body;

            const user = await UserRepo.updateUser(id, data);

            return reply.code(200).send({ user });
        } catch (error: any) {
            // Se quiser, aqui dá pra tratar P2025 (registro não encontrado) como 404
            return reply.code(500).send({ message: "Erro ao atualizar usuário", error });
        }
    },

    remove: async (
        req: FastifyRequest<{ Params: IdParams }>,
        reply: FastifyReply
    ) => {
        try {
            const { id } = req.params;

            const user = await UserRepo.deleteUser(id);

            return reply.code(200).send({ message: "Usuário excluído com sucesso", user });
        } catch (error: any) {
            return reply.code(500).send({ message: "Erro ao excluir usuário", error });
        }
    },
};