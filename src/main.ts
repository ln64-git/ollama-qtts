import { Ollama } from "@langchain/ollama";
import * as fs from "fs/promises";

type Options = {
  maxTokens: number;
  includeResearch: boolean;
};

// ─────────────────────────────────────────────
// Qtts system
async function callQtts(text: string): Promise<void> {
  console.log("🔊 Speaking:", text);
  await new Promise(resolve => setTimeout(resolve, 500));
}

// ─────────────────────────────────────────────
// Markdown cleanup
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/#+\s?/g, '')
    .replace(/[-*]\s+/g, '')
    .replace(/\n{2,}/g, '\n')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/>\s+/g, '')
    .trim();
}

// ─────────────────────────────────────────────
// Parse CLI args
function parseArgs(): Options {
  const args = process.argv.slice(2);
  const maxTokens = parseInt(args[0] || "60", 10);
  const includeResearch = args.includes("-research");
  return { maxTokens, includeResearch };
}

// ─────────────────────────────────────────────
// Read local files
async function readScratchpad(path: string): Promise<string> {
  try {
    return await fs.readFile(path, "utf-8");
  } catch {
    console.error("⚠️ Error reading scratchpad");
    return "";
  }
}

async function readDailyNote(dir: string): Promise<string> {
  try {
    const today = new Date().toISOString().split("T")[0];
    return await fs.readFile(`${dir}/${today}.md`, "utf-8");
  } catch {
    console.error("⚠️ Error reading daily note");
    return "";
  }
}

// ─────────────────────────────────────────────
// Create the prompt
function buildPrompt(scratchpad: string, research: string, includeResearch: boolean): string {
  return includeResearch && research.trim()
    ? `${scratchpad.trim()}\n\n${research.trim()}`
    : scratchpad.trim();
}

// ─────────────────────────────────────────────
// Stream + buffer LLM output
async function speakStream(llm: Ollama, prompt: string) {
  const stream = await llm.stream(prompt);
  let buffer = "";

  for await (const chunk of stream) {
    const token = chunk ?? "";
    buffer += token;

    if (/[.?!,;:\n]/.test(token) && buffer.length > 40) {
      const cleaned = stripMarkdown(buffer.trim());
      if (cleaned.length > 5) await callQtts(cleaned);
      buffer = "";
    }
  }

  if (buffer.trim().length > 5) {
    await callQtts(stripMarkdown(buffer.trim()));
  }
}

// ─────────────────────────────────────────────
// Entry point
(async () => {
  const { maxTokens, includeResearch } = parseArgs();
  console.log(`🔧 maxTokens = ${maxTokens}`);
  console.log(`📚 Include Research = ${includeResearch}`);

  const vaultRoot = "/home/ln64/Documents/ln64-vault";
  const researchPath = `${vaultRoot}/Daily Research`;
  const scratchpadPath = `${researchPath}/scratchpad.md`;

  const scratchpad = await readScratchpad(scratchpadPath);
  const dailyNote = includeResearch ? await readDailyNote(researchPath) : "";

  const prompt = buildPrompt(scratchpad, dailyNote, includeResearch);

  const llm = new Ollama({
    model: "gemma3",
    temperature: 0.7,
    numPredict: maxTokens,
  });

  await speakStream(llm, prompt);
})();
