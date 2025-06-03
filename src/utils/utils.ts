// ─────────────────────────────────────────────
import type { Ollama } from "@langchain/ollama";

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
// Read local files
async function readScratchpad(path: string): Promise<string> {
  try {
    return await Bun.file(path).text();
  } catch {
    console.error("⚠️ Error reading scratchpad");
    return "";
  }
}

async function readDailyNote(dir: string): Promise<string> {
  try {
    const today = new Date().toISOString().split("T")[0];
    return await Bun.file(`${dir}/${today}.md`).text();
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

