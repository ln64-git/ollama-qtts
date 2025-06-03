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

  // right now I can toggle this with command
  // but it isnt transcribing anything yet
  // my guess is it's not recording the voice audio
  // so tomorrow I'll debug how to record voice to scratchpad

  // once I can speak to ollama through the scratchpad
  // I'll just need to figure out a way to record while holding the keybind
  // hold keybind to record voice
  // two keybinds for calling ollama with or without research

  public async recordVoice() {
    await toggleRecording(this);
  }

}

