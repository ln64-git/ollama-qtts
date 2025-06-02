// src/main.ts
import { checkServerRunning, startServer, updateServer } from "./utils/cli";
import { parseArgs } from "./utils/utils";

const values = parseArgs();
const port = parseInt(values.port || "2001", 10);
const updatePayload: Record<string, any> = {};

// Fill update payload from CLI
if (values.maxTokens) updatePayload.maxTokens = parseInt(values.maxTokens, 10);
if (values.scratchpad) updatePayload.scratchpad = values.scratchpad;
if (values.model) updatePayload.model = values.model;
if (values.temperature) updatePayload.temperature = parseFloat(values.temperature);
if (values.qttsPort) updatePayload.qttsPort = parseInt(values.qttsPort, 10);

const wantsToToggleUseResearch = process.argv.includes("--useResearch");

(async () => {
  const isRunning = await checkServerRunning(port);

  if (!isRunning) {
    await startServer(port);
  } else {
    console.log(`✅ Server is already running on port ${port}`);
  }

  if (Object.keys(updatePayload).length > 0 || wantsToToggleUseResearch) {
    await updateServer(port, updatePayload, wantsToToggleUseResearch);
  }
})();
