import type { MiddlewareHandler } from "hono";
import type { DemoRecord, Env } from "../types";
import { isExpired } from "../lib/kv";

// Server-side expiry enforcement for client WRITE routes. This is the
// real authority — independent of the client-side countdown, so editing
// the browser JS to hide/fake the countdown cannot extend write access.
// Must run AFTER requireDemoExists (needs "demo" on context). Admin
// routes never use this middleware — admin can always write, even to an
// expired demo (needed for the "extend" action to work at all).
export const requireNotExpired: MiddlewareHandler<{
  Bindings: Env;
  Variables: { demo: DemoRecord };
}> = async (c, next) => {
  const demo = c.get("demo");
  if (isExpired(demo)) {
    return c.json({ error: "expired" }, 403);
  }
  await next();
};
