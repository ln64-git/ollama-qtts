// src/utils/cli.ts
import { spawn } from "child_process";
import { request } from "undici";
import { setTimeout } from "timers/promises";
import type { OllamaSpeakerState } from "./types";

/**
 * Check if the server is running on the given port.
 */
export const checkServerRunning = async (port: number): Promise<boolean> => {
  try {
    const res = await request(`http://localhost:${port}/state`, {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
    });
    return res.statusCode === 200;
  } catch {
    return false;
  }
};

/**
 * Start the Bun server on the given port.
 */
export const startServer = async (port: number) => {
  console.log(`🚀 Starting server on port ${port}`);
  spawn("bun", ["run", "./src/utils/server.ts"], {
    stdio: "inherit",
    env: { ...process.env, PORT: String(port) },
  });

  await setTimeout(50);
};

/**
 * Update the server state with given payload.
 */
export const updateServer = async (
  port: number,
  updatePayload: Record<string, any>,
  wantsToToggleUseResearch: boolean
) => {
  try {
    if (wantsToToggleUseResearch) {
      const res = await request(`http://localhost:${port}/state`, { method: "GET" });
      const state = (await res.body.json()) as OllamaSpeakerState;
      updatePayload.useResearch = !state.useResearch;
      console.log(`🔁 Toggling useResearch → ${updatePayload.useResearch}`);
    }

    const res = await request(`http://localhost:${port}/state`, {
      method: "POST",
      body: JSON.stringify(updatePayload),
      headers: { "content-type": "application/json" },
    });
    const body = await res.body.json();
    console.log("✅ Server updated:", body);
  } catch (err) {
    console.error("❌ Failed to update server:", err);
  }
};
