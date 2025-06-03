import { spawn } from "child_process";
import { existsSync, mkdirSync, unlinkSync } from "fs";
import { once } from "events";
import { writeScratchpad } from "./utils";
import type { OllamaSpeaker } from "../OllamaSpeaker";

const SCRATCHPAD = "/home/ln64/Documents/ln64-vault/Daily Research/scratchpad.md";
const AUDIO_PATH = "/tmp/voice.wav";
const WHISPER_PATH = "./whisper.cpp"; // path to whisper.cpp folder
const LOCKFILE = "/tmp/recording.lock";



export async function toggleRecording(app: OllamaSpeaker): Promise<void> {
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

function startRecording(): void {
  spawn("ffmpeg", [
    "-y",
    "-f", "pulse",
    "-i", "default",
    "-ac", "1",              // mono
    "-filter:a", "loudnorm", // normalize volume
    AUDIO_PATH,
  ], {
    stdio: "ignore",
    detached: true,
  }).unref();
}

async function stopRecording(): Promise<void> {
  spawn("pkill", ["-INT", "ffmpeg"], {
    stdio: "ignore",
  });
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for flush
}

async function transcribeAudio(): Promise<string> {
  const modelPath = `${WHISPER_PATH}/models/ggml-base.en.bin`;
  const cliPath = `${WHISPER_PATH}/build/bin/whisper-cli`;

  const outputFile = `${WHISPER_PATH}/output`;
  const whisper = spawn(cliPath, [
    "-m", modelPath,
    "-f", AUDIO_PATH,
    "-otxt",
    "-of", outputFile, // whisper will add `.txt`
  ]);
  await once(whisper, "exit");

  const transcriptPath = `${outputFile}.txt`;
  const transcript = await Bun.file(transcriptPath).text().catch(err => {
    console.error("❌ Could not read transcript:", err);
    return "";
  });
  return transcript.trim();
}

export async function setupWhisper(): Promise<void> {
  const binPath = `${WHISPER_PATH}/build/bin/whisper-cli`;
  const modelPath = `${WHISPER_PATH}/models/ggml-base.en.bin`;

  if (existsSync(binPath) && existsSync(modelPath)) {
    return;
  }

  // Clone repo if not exists
  if (!existsSync(WHISPER_PATH)) {
    console.log("📥 Cloning whisper.cpp...");
    await run("git", ["clone", "https://github.com/ggerganov/whisper.cpp", WHISPER_PATH]);
  }

  // Build if CLI binary is missing
  if (!existsSync(binPath)) {
    console.log("🔧 Building whisper.cpp...");
    await run("cmake", ["-B", "build"], { cwd: WHISPER_PATH });
    await run("cmake", ["--build", "build", "--config", "Release"], { cwd: WHISPER_PATH });
  }

  // Download model if not exists
  if (!existsSync(modelPath)) {
    console.log("⬇️ Downloading model...");
    mkdirSync(`${WHISPER_PATH}/models`, { recursive: true });
    await run("bash", ["models/download-ggml-model.sh", "base.en"], { cwd: WHISPER_PATH });
  }

  console.log("🎉 whisper.cpp is ready to use!");
}


async function run(command: string, args: string[], options: { cwd?: string } = {}) {
  const child = spawn(command, args, { stdio: "inherit", ...options });
  await once(child, "exit");
}
