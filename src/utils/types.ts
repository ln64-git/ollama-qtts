import { z } from "zod";

export type OllamaSpeakerState = z.infer<typeof OllamaSchema>;
export const OllamaSchema = z.object({
  port: z.number(),
  qttsPort: z.number(),
  useResearch: z.boolean(),
  model: z.string(),
  temperature: z.number(),
  maxTokens: z.number(),
  isRecording: z.boolean(),
});

export type StreamOllamaParams = {
  prompt: string;
  model?: string;
  temperature?: number;
  numPredict?: number;
};