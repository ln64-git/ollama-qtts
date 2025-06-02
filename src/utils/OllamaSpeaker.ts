export class OllamaSpeaker {
  maxTokens: number = 60;
  scratchpad: string = "";
  useResearch: boolean = false;

  constructor() { }

  update(data: Partial<Pick<OllamaSpeaker, "maxTokens" | "scratchpad" | "useResearch">>) {
    if (typeof data.maxTokens === "number") {
      this.maxTokens = data.maxTokens;
    }
    if (typeof data.scratchpad === "string") {
      this.scratchpad = data.scratchpad;
    }
    if (typeof data.useResearch === "boolean") {
      this.useResearch = data.useResearch;
    }
  }

  getState() {
    return {
      maxTokens: this.maxTokens,
      scratchpad: this.scratchpad,
      useResearch: this.useResearch,
    };
  }

  async sendQtts(): Promise<void> {
    console.log("🧠 Generating with state:");
    console.log(this.getState());
    // TODO: connect to Ollama + Qtts here
  }
}

// Runtime validator (optional but safe)
export function isValidUpdateBody(
  body: any
): body is Partial<Pick<OllamaSpeaker, "maxTokens" | "scratchpad" | "useResearch">> {
  return (
    typeof body === "object" &&
    body !== null &&
    (body.maxTokens === undefined || typeof body.maxTokens === "number") &&
    (body.scratchpad === undefined || typeof body.scratchpad === "string") &&
    (body.useResearch === undefined || typeof body.useResearch === "boolean")
  );
}
