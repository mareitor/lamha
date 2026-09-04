import type { MiddlewareHandler } from "hono";
import type { DemoRecord, Env } from "../types";
import { getDemo } from "../lib/kv";

// Loads demo:<id> and attaches it to context as "demo" for downstream
// handlers/middleware. 404s for both "never existed" — the client-facing
// GET route intentionally reshapes this into the same generic response
// as "expired" so the two aren't distinguishable from outside.
export const requireDemoExists: MiddlewareHandler<{
  Bindings: Env;
  Variables: { demo: DemoRecord };
}> = async (c, next) => {
  const id = c.req.param("id");
  const demo = id ? await getDemo(c.env, id) : null;
  if (!demo) {
    return c.json({ error: "not_found" }, 404);
  }
  c.set("demo", demo);
  await next();
};
