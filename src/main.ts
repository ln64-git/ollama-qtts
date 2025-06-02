import { Ollama } from "@langchain/ollama";
import * as fs from "fs/promises";

// Qtts system (placeholder)
async function callQtts(text: string): Promise<void> {
  console.log("🔊 Speaking:", text);
  await new Promise(resolve => setTimeout(resolve, 500));
}

// Strip basic markdown
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

(async () => {
  const args = process.argv.slice(2);
  const maxTokens = parseInt(args[0] || "60", 10);
  const includeResearch = args.includes("-research");

  console.log(`🔧 maxTokens = ${maxTokens}`);
  console.log(`📚 Include Research = ${includeResearch}`);

  const vaultRoot = "/home/ln64/Documents/ln64-vault";
  const dailyResearchPath = `${vaultRoot}/Daily Research`;
  const scratchpadPath = `${dailyResearchPath}/scratchpad.md`;

  let scratchpad = "";
  let dailyNote = "";

  try {
    scratchpad = await fs.readFile(scratchpadPath, "utf-8");
  } catch (err) {
    console.error("⚠️ Error reading scratchpad:", err);
  }

  if (includeResearch) {
    try {
      const today = new Date().toISOString().split("T")[0];
      const todayMdPath = `${dailyResearchPath}/${today}.md`;
      dailyNote = await fs.readFile(todayMdPath, "utf-8");
    } catch (err) {
      console.error("⚠️ Error reading today's daily note:", err);
    }
  }

  let prompt = scratchpad;
  if (includeResearch && dailyNote.trim()) {
    prompt += `\n\n${dailyNote}`;
  }

  const llm = new Ollama({
    model: "gemma3",
    temperature: 0.7,
    numPredict: maxTokens,
  });

  const stream = await llm.stream(prompt);

  let buffer = "";

  for await (const chunk of stream) {
    const token = chunk ?? "";
    buffer += token;

    if (/[.?!,;:\n]/.test(token) && buffer.length > 40) {
      const cleaned = stripMarkdown(buffer.trim());
      if (cleaned.length > 5) {
        await callQtts(cleaned);
      }
      buffer = "";
    }
  }

  if (buffer.trim().length > 5) {
    await callQtts(stripMarkdown(buffer.trim()));
  }
})();
