import { DynamicServerApp } from "./app";
import { OllamaSchema, type OllamaSpeakerState } from "./utils/types";

export class OllamaSpeaker extends DynamicServerApp<OllamaSpeakerState> {
  schema = OllamaSchema;
  port = 2001;
  qttsPort = 2002;
  scratchpad = "";
  useResearch = false;
  model = "gemma3";
  temperature = 0.7;
  maxTokens = 60;

  public async sendQtts(): Promise<void> {
    console.log("🧠 Generating with:", this.getState());
  }
}
