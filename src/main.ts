import { existsSync, unlinkSync } from "fs";
import { runDynamicApp } from "./app";
import { OllamaSpeaker } from "./OllamaSpeaker";
const LOCKFILE = "/tmp/recording.lock";

// Only run this ONCE when starting the app
if (process.argv.length <= 2 && existsSync(LOCKFILE)) {
  unlinkSync(LOCKFILE);
  console.log("🧹 Removed stale LOCKFILE on startup");
}

const defaultSpeaker = new OllamaSpeaker();

runDynamicApp(defaultSpeaker);
