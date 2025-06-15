// ─────────────────────────────────────────────
import { Ollama } from "@langchain/ollama";
import type { StreamOllamaParams } from "./types";

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

export async function readScratchpad(): Promise<string> {
  const path = "/home/ln64/Documents/ln64-vault/Daily Research/scratchpad.md"
  try {
    return await Bun.file(path).text();
  } catch {
    console.error("⚠️ Error reading scratchpad");
    return "";
  }
}

export async function writeScratchpad(content: string): Promise<void> {
  const path = "/home/ln64/Documents/ln64-vault/Daily Research/scratchpad.md";
  try {
    await Bun.write(path, content);
  } catch (error) {
    console.error("⚠️ Error writing to scratchpad:", error);
  }
}

export async function getResearchData(): Promise<string> {
  const dir = "/home/ln64/Documents/ln64-vault/Daily Research";
  try {
    const today = new Date().toISOString().split("T")[0];
    return await Bun.file(`${dir}/${today}.md`).text();
  } catch {
    return "";
  }
}

export async function callQtts(text: string, port: number = 2001): Promise<void> {
  const url = `http://localhost:${port}/input`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("⚠️ Error calling QTTs:", error);
  }   
}

export async function* streamOllama({
  prompt,
  model = "gemma3",
  temperature = 0.7,
  numPredict = 60,
}: StreamOllamaParams): AsyncGenerator<string> {
  const llm = new Ollama({ model, temperature, numPredict });
  const stream = await llm.stream(prompt);
  let buffer = "";
  const MIN_LENGTH = 5;

  for await (const chunk of stream) {
    if (!chunk) continue;
    buffer += chunk;
    if (/[.?!\n](?:\s|$)/.test(chunk) && buffer.length > 40) {
      const cleaned = stripMarkdown(buffer.trim());
      if (cleaned.length > MIN_LENGTH) {
        yield cleaned;
      }
      buffer = "";
    }
  }

  const final = stripMarkdown(buffer.trim());
  if (final.length > MIN_LENGTH) {
    yield final;
  }
}

