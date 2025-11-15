import { z } from "zod";

// Params genéricos com id
export const idParamsSchema = z.object({
  id: z.cuid("id é inválido"),
  // se estiver usando cuid: z.cuid("id inválido");
  // se for UUID: z.string().uuid("id inválido");
});

// Body para criar usuário
export const createUserSchema = z.object({
  email: z.email("E-mail inválido"),
  displayName: z
    .string()
    .min(1, "Nome não pode ser vazio")
    .max(120, "Nome muito grande")
    .optional(),
  nickname: z
    .string()
    .min(1, "Apelido não pode ser vazio")
    .max(60, "Apelido muito grande")
    .optional(),
  // Se seu enum for exatamente esse:
  locale: z.enum(["pt_BR", "en_US", "es_ES"]).optional(),
  timezone: z.string().min(1, "Timezone é obrigatório"),

  checkInHour: z
    .number()
    .int()
    .min(0)
    .max(23)
    .optional(),
  checkInMinute: z
    .number()
    .int()
    .min(0)
    .max(59)
    .optional(),

  soundEnabled: z.boolean().optional(),
  soundId: z.string().min(1).optional().nullable(),
});

// Body para atualizar usuário (todos os campos opcionais)
export const updateUserSchema = createUserSchema.partial();
