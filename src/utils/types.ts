export interface OllamaSpeakerState {
  port: number;
  qttsPort: number;
  scratchpad: string;
  useResearch: boolean;
  model: string;
  temperature: number;
  maxTokens: number;
}