import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { DynamicServerApp, startServer } from "../src/app";

type TestState = z.infer<typeof TestSchema>;
const TestSchema = z.object({
  port: z.number(),
  message: z.string(),
});


class TestApp extends DynamicServerApp<TestState> {
  schema = TestSchema;
  port = 3005;
  message = "initial";
}

describe("DynamicServerApp HTTP interface", () => {
  let app: TestApp;

  beforeEach(async () => {
    app = new TestApp();
    startServer(app, { port: app.port }); // fire up the server
    await new Promise((r) => setTimeout(r, 100)); // wait for Bun.serve
  });

  it("should update state via HTTP", async () => {
    const response = await fetch(`http://localhost:${app.port}/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "updated" }),
    });

    expect(response.ok).toBe(true);
    const res = await response.json() as { state: unknown };
    const data = TestSchema.parse(res.state);
    expect(data.message).toBe("updated");
  });
});
