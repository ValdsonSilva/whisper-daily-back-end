import type { Prisma, User } from '@prisma/client';
import { prisma } from "../../core/config/prisma";
// const { Prisma, User } = prismaPkg;

export const UserRepo = {

    listAllUsers: async (): Promise<User[]> => {
        return await prisma.user.findMany()
    },

    listUserById: async (id: string): Promise<User | null> => {
        return await prisma.user.findUnique({
            where: {
                id
            }
        })
    },

    createUser: async (data: Prisma.UserCreateInput): Promise<User> => {
        return await prisma.user.create({ data });
    },

    updateUser: async (id: string, data: Prisma.UserUpdateInput): Promise<User> => {
        return await prisma.user.update({
            where: {
                id
            }, data
        });
    },

    deleteUser: async (id: string): Promise<User> => {
        return await prisma.user.delete({
            where: {
                id
            }
        })
    },

}