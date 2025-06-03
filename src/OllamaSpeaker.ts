import { DynamicServerApp } from "./app";
import { setupWhisper, startRecording, stopRecording, transcribeAudio } from "./utils/record";
import { OllamaSchema, type OllamaSpeakerState } from "./utils/types";
import { callQtts, getResearchData, readScratchpad, streamOllama, writeScratchpad } from "./utils/utils";
import { unlinkSync } from "fs";

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
    console.log("🦙 Asking Ollama...");
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


  public async startRecording(): Promise<void> {
    if (!this.isRecording) {
      await setupWhisper();
      console.log("🔴 Recording...");
      await Bun.write("/tmp/recording.lock", "1");
      startRecording();
      this.isRecording = true;
    }
  }

  public async stopRecording(): Promise<void> {
    if (this.isRecording) {
      console.log("⚫ Recording Stopped.");
      unlinkSync("/tmp/recording.lock");
      await stopRecording();
      const transcript = await transcribeAudio();
      await writeScratchpad(transcript);
      this.isRecording = false;
    }
  }

}

