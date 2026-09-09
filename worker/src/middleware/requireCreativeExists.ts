import type { MiddlewareHandler } from "hono";
import type { CreativeRegistryEntry, Env } from "../types";
import { getCreativeRegistry } from "../lib/kv";

// Creative self-intake (Sept 2026) — loads the creative matching
// :creativeId from the registry and attaches it to context as
// "creative". 404s for both "never existed" and "archived" (trashed),
// same non-distinguishable-from-outside shape as requireDemoExists.
//
// This id IS the auth for the whole creative-intake route group, no
// password — same trust model already used for demo links
// (generateItemId's 80 bits of crypto randomness makes it unguessable in
// practice, even though its doc comment was written with collision-risk
// in mind rather than auth). Only ever send this link to the creative it
// belongs to.
export const requireCreativeExists: MiddlewareHandler<{
  Bindings: Env;
  Variables: { creative: CreativeRegistryEntry };
}> = async (c, next) => {
  const id = c.req.param("creativeId");
  const registry = id ? await getCreativeRegistry(c.env) : [];
  const creative = registry.find((e) => e.id === id && e.status !== "archived") ?? null;
  if (!creative) {
    return c.json({ error: "not_found" }, 404);
  }
  c.set("creative", creative);
  await next();
};
