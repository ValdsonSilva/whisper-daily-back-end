// src/config/env.ts
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  HF_API_KEY: z.string().min(1, 'HF_API_KEY is required'),
  HF_MODEL_ID: z.string().min(1, 'HF_MODEL_ID is required'),
  WHISPER_MAX_TOKENS: z.coerce.number().default(120),
  WHISPER_TEMPERATURE: z.coerce.number().default(0.7),
  HF_BASE_URL: z.string().default('https://router.huggingface.co/v1'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
