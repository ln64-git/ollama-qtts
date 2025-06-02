import type { OllamaSpeakerState } from "./utils/types";


export class OllamaSpeaker {
  port: number = 2001;
  qttsPort: number = 2002;
  scratchpad: string = "";
  useResearch: boolean = false;
  model: string = "gemma3";
  temperature: number = 0.7;
  maxTokens: number = 60;

  constructor() { }

  getState() {
    return {
      maxTokens: this.maxTokens,
      scratchpad: this.scratchpad,
      useResearch: this.useResearch,
      model: this.model,
      temperature: this.temperature,
    };
  }

  update(data: Partial<OllamaSpeakerState>) {
    if (typeof data.useResearch === "boolean") {
      this.useResearch = data.useResearch;
    }
    if (typeof data.maxTokens === "number") {
      this.maxTokens = data.maxTokens;
    }
    if (typeof data.scratchpad === "string") {
      this.scratchpad = data.scratchpad;
    }
    if (typeof data.model === "string") {
      this.model = data.model;
    }
    if (typeof data.temperature === "number") {
      this.temperature = data.temperature;
    }
  }

  async sendQtts(): Promise<void> {
    console.log("🧠 Generating with state:");
    // Connect to Qtts here
  }
}

// Validate incoming data
export function isValidUpdateBody(
  body: any
): body is Partial<OllamaSpeakerState> {
  return (
    typeof body === "object" &&
    body !== null &&
    (body.maxTokens === undefined || typeof body.maxTokens === "number") &&
    (body.scratchpad === undefined || typeof body.scratchpad === "string") &&
    (body.useResearch === undefined || typeof body.useResearch === "boolean") &&
    (body.model === undefined || typeof body.model === "string") &&
    (body.temperature === undefined || typeof body.temperature === "number")
  );
}
