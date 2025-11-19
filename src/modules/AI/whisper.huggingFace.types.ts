// src/ai/whisper.types.ts

export type WhisperMode = 'morning' | 'night' | 'general';

export interface WhisperContext {
  currentIntention?: string;
  lastReflectionSummary?: string;
  whisperLeafEarnedToday?: boolean;
  streakDays?: number;
  lastMessages?: { from: 'user' | 'ai'; text: string }[];
}

export interface WhisperRequest {
  message: string;
  mode?: WhisperMode;
  context?: WhisperContext;
}

export interface WhisperResponse {
  reply: string;
  safetyMode: boolean;
}
