import { ZodObject } from "zod";

export abstract class DynamicServerApp<T extends Record<string, any>> {
  abstract port: number;
  abstract schema: ZodObject<any>;

  getState(): Partial<T> {
    const state: Partial<T> = {};
    let obj = this;
    do {
      for (const key of Object.getOwnPropertyNames(obj)) {
        if (key === "schema" || typeof (this as any)[key] === "function") continue;
        try {
          const val = (this as any)[key];
          if (!(key in state)) (state as any)[key] = val;
        } catch { }
      }
      obj = Object.getPrototypeOf(obj);
    } while (obj && obj !== Object.prototype);
    return state;
  }

  applyStateUpdate(data: Partial<T>): void {
    const validated = this.schema.partial().parse(data);
    Object.entries(validated).forEach(([key, value]) => {
      if (key in this) (this as any)[key] = value;
    });
  }

  getMetadata(): Record<string, string> {
    return Object.getOwnPropertyNames(this).reduce((meta, key) => {
      const val = (this as any)[key];
      if (typeof val !== "function") meta[key] = typeof val;
      return meta;
    }, {} as Record<string, string>);
  }

  async probe(timeout = 1000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(`http://localhost:${this.port}/state`, {
        signal: controller.signal,
      });

      clearTimeout(id);
      return res.ok;
    } catch {
      return false;
    }
  }

  async set(diff: Partial<T>): Promise<void> {
    try {
      await fetch(`http://localhost:${this.port}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(diff),
      });
    } catch { }
  }
}

export async function runDynamicApp<T extends Record<string, any>>(appInstance: DynamicServerApp<T>): Promise<void> {
  const rawDefaults = appInstance as unknown as T;

  const { state, rawFlags, mode, targetKeys } = cliToState(rawDefaults);
  const stateDiff = diffStatePatch(state, appInstance.getState() as T);

  const routes = buildRoutes(appInstance);

  if (mode === "get" && targetKeys.length > 0) {
    const isRunning = await appInstance.probe();
    const current = isRunning
      ? await (await fetch(`http://localhost:${appInstance.port}/state`)).json()
      : appInstance.getState();

    for (const key of targetKeys) {
      const currentState = current as Record<string, any>;
      console.log(`${key}:`, currentState[key]);
    }
    return;
  }

  if (mode === "set" && Object.keys(stateDiff).length > 0) {
    const isRunning = await appInstance.probe();
    if (isRunning) {
      await appInstance.set(stateDiff);
      const res = await fetch(`http://localhost:${appInstance.port}/state`);
      const json = await res.json();
      console.log("Remote state updated:", json);
    } else {
      appInstance.applyStateUpdate(stateDiff);
      console.log("Local state updated:", appInstance.getState());
    }
    return;
  }

  if (rawFlags.length) {
    const handler = routes[`/${rawFlags[0]}`];
    if (handler) return await handler(appInstance);
  }

  if (!(await appInstance.probe())) {
    console.log(`Starting server on port ${appInstance.port}...`);
    return startServer(appInstance, { port: appInstance.port, routes });
  } else {
    console.log(`Server is already running on port ${appInstance.port}.`);
  }

  if (Object.keys(stateDiff).length > 0) {
    await appInstance.set(stateDiff);
  }
}

function buildRoutes<T extends Record<string, any>>(
  appInstance: DynamicServerApp<T>
): Record<string, RemoteAction<T>> {
  return Object.getOwnPropertyNames(Object.getPrototypeOf(appInstance))
    .filter(key => key !== "constructor" && typeof (appInstance as any)[key] === "function")
    .reduce((acc, key) => {
      acc[`/${key}`] = async (app, args) => await (app as any)[key](...(args || []));
      return acc;
    }, {} as Record<string, RemoteAction<T>>);
}

export type RemoteAction<T extends Record<string, any>> = (
  appInstance: DynamicServerApp<T>,
  args?: any
) => Promise<any>;

export function startServer<T extends Record<string, any>>(
  appInstance: DynamicServerApp<T>,
  options: {
    port?: number;
    routes?: Record<string, RemoteAction<T>>;
  } = {}
) {
  const port = options.port ?? 2001;
  const routes = options.routes ?? {};

  Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const method = req.method;

      if (url.pathname === "/state") {
        if (method === "GET") {
          return Response.json(appInstance.getState());
        }

        if (method === "POST") {
          try {
            const body = await req.json() as Partial<T>;
            appInstance.applyStateUpdate(body);
            const updated = appInstance.getState();
            return Response.json({ status: "updated", state: updated });
          } catch (err: any) {
            return Response.json({ error: err.message || "Invalid JSON" }, { status: 400 });
          }
        }

        return new Response("Method Not Allowed", { status: 405 });
      }

      const routeHandler = routes[url.pathname];
      if (method === "POST" && routeHandler) {
        try {
          const args = await req.json();
          const result = await routeHandler(appInstance, args);
          return Response.json({ status: "ok", result });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      }

      return new Response("Not Found", { status: 404 });
    },
  });
}
// src/core/CLI.ts
export function cliToState<T extends Record<string, any>>(defaults: T): { state: T; rawFlags: string[]; mode: "get" | "set" | null; targetKeys: string[] } {
  const args = process.argv.slice(2);
  const state = { ...defaults };
  const rawFlags: string[] = [];
  let mode: "get" | "set" | null = null;
  const targetKeys: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-get") {
      mode = "get";
      continue;
    }

    if (arg === "-set") {
      mode = "set";
      continue;
    }

    if (arg?.startsWith("--")) {
      const key = arg.slice(2) as keyof T;
      const next = args[i + 1];

      if (mode === "get") {
        targetKeys.push(String(key));
      } else if (mode === "set") {
        const current = defaults[key];
        const type = typeof current;

        if (type === "number" && next && !isNaN(Number(next))) {
          state[key] = Number(next) as T[typeof key];
          i++;
        } else if (type === "boolean") {
          state[key] = (next === undefined || next === "true") as T[typeof key];
        } else if (next && !next.startsWith("--")) {
          state[key] = next as T[typeof key];
          i++;
        }
      } else {
        rawFlags.push(key as string);
      }
    }
  }

  return { state, rawFlags, mode, targetKeys };
}


export function diffStatePatch<T extends Record<string, any>>(cliArgs: T, defaults: T): Partial<T> {
  const patch: Partial<T> = {};
  for (const key in cliArgs) {
    if (cliArgs[key] !== defaults[key]) {
      patch[key] = cliArgs[key];
    }
  }
  return patch;
}