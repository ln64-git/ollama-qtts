import { DynamicServerApp } from "./app";
import { setupWhisper, startRecording, stopRecording, transcribeAudio } from "./utils/record";
import { OllamaSchema, type OllamaSpeakerState } from "./utils/types";
import { callQtts, getResearchData, readScratchpad, streamOllama, writeScratchpad } from "./utils/utils";
import { existsSync, unlinkSync } from "fs";

const SCRATCHPAD = "/home/ln64/Documents/ln64-vault/Daily Research/scratchpad.md";
const LOCKFILE = "/tmp/recording.lock";

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

  public async toggleRecording(app: OllamaSpeaker): Promise<void> {
    await setupWhisper();
    const recording = existsSync(LOCKFILE);
    if (recording) {
      console.log("🔁 Stopping recording...");
      try {
        unlinkSync(LOCKFILE);
        await stopRecording();
        const transcript = await transcribeAudio();
        console.log("transcript: ", transcript);
        await writeScratchpad(transcript);
        app.isRecording = false;
      } catch (err) {
        console.error("❌ Error while stopping recording:", err);
      }
    } else {
      console.log("⏺️ Starting new recording...");
      try {
        await Bun.write(SCRATCHPAD, "");
        await Bun.write(LOCKFILE, "1");
        startRecording();
        app.isRecording = true;
      } catch (err) {
        console.error("❌ Error while starting recording:", err);
      }
    }
  }

  public async holdToRecord() { }

}

