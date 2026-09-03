import type { MiddlewareHandler } from "hono";
import type { DemoRecord, Env } from "../types";

// Field-level write gate for routes only a self-service client may use
// (programming CRUD, budget edit). This is NOT a separate auth tier —
// identity is still just the demo ID in the URL — it's a re-check of the
// demo's stored `mode` on every write, server-side, so a client can never
// bypass it by lying about its own mode. Must run after requireDemoExists.
export const requireSelfService: MiddlewareHandler<{
  Bindings: Env;
  Variables: { demo: DemoRecord };
}> = async (c, next) => {
  const demo = c.get("demo");
  if (demo.mode !== "self-service") {
    return c.json({ error: "managed_mode_read_only" }, 403);
  }
  await next();
};
