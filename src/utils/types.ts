import { z } from "zod";

export type OllamaSpeakerState = z.infer<typeof OllamaSchema>;
export const OllamaSchema = z.object({
  port: z.number(),
  qttsPort: z.number(),
  scratchpad: z.string(),
  useResearch: z.boolean(),
  model: z.string(),
  temperature: z.number(),
  maxTokens: z.number(),
});

