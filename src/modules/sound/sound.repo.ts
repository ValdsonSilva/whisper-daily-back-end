import type {AmbientSound, Prisma} from '@prisma/client';
import { prisma } from "../../core/config/prisma";

export const SoundRepo = {

    listAllSounds: async (): Promise<AmbientSound[]> => {
        return await prisma.ambientSound.findMany();
    },

    listSoundByUserId: async (id: string): Promise<AmbientSound | null> => {
        return await prisma.ambientSound.findUnique({
            where: { id }
        });
    },

    createSound: async (data: Prisma.AmbientSoundCreateInput): Promise<AmbientSound | null> => {
        return await prisma.ambientSound.create({ data });
    },

    updateSound: async (id: string, data: Prisma.AmbientSoundUpdateInput): Promise<AmbientSound | null> => {
        return await prisma.ambientSound.update({
            where: { id },
            data
        });
    },

    deleteSound: async (id: string): Promise<AmbientSound | null> => {
        return await prisma.ambientSound.delete({
            where: { id }
        });
    },
};