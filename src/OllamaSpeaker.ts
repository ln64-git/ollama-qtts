import { DynamicServerApp } from "./app";
import { toggleRecording } from "./utils/record";
import { OllamaSchema, type OllamaSpeakerState } from "./utils/types";
import { callQtts, getResearchData, readScratchpad, streamOllama } from "./utils/utils";

export class OllamaSpeaker extends DynamicServerApp<OllamaSpeakerState> {
  schema = OllamaSchema;

  port = 2000;
  qttsPort = 2001;

  useResearch = true;

  model = "gemma3";
  temperature = 0.7;
  maxTokens = 120;

  isRecording = false;

  public async askOllama(): Promise<void> {
    console.log("🔍 Asking Ollama...");
    const scratchpad = await readScratchpad();
    if (scratchpad !== "") {
      let prompt = scratchpad;
      if (this.useResearch) {
        prompt += "\n\n" + (await getResearchData());
      }
      const stream = streamOllama({
        prompt,
        model: this.model,
        temperature: this.temperature,
        numPredict: this.maxTokens,
      });
      for await (const chunk of stream) {
        callQtts(chunk);
      }
    }
  }

  public async recordVoice() {
    await toggleRecording(this);
    console.log(`📢 Server instance: isRecording=${this.isRecording}`);
  }

}

