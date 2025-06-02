import { serve } from "bun";
import { OllamaSpeaker, isValidUpdateBody } from "./OllamaSpeaker";

const speaker = new OllamaSpeaker();

serve({
  port: 2001,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    if (path === "/state" && method === "POST") {
      try {
        const body = await req.json();
        if (!isValidUpdateBody(body)) {
          return new Response("Invalid data structure", { status: 400 });
        }

        speaker.update(body);
        return Response.json({ status: "updated", state: speaker.getState() });
      } catch {
        return new Response("Invalid JSON", { status: 400 });
      }
    }

    if (path === "/send" && method === "POST") {
      speaker.sendQtts();
      return Response.json({ status: "started" });
    }

    return new Response("Not found", { status: 404 });
  },
});
