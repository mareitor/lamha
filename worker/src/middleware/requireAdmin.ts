import type { MiddlewareHandler } from "hono";
import type { Env } from "../types";

// Constant-time string comparison to avoid timing attacks on the shared
// admin password. Both inputs are hashed to a fixed length first so the
// comparison itself doesn't leak length information either.
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const bytesA = new Uint8Array(digestA);
  const bytesB = new Uint8Array(digestB);
  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) {
    diff |= bytesA[i] ^ bytesB[i];
  }
  return diff === 0;
}

export const requireAdmin: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const authHeader = c.req.header("Authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!c.env.ADMIN_PASSWORD) {
    // Misconfigured deployment — fail closed, not open.
    return c.json({ error: "server_misconfigured" }, 500);
  }
  if (!provided || !(await timingSafeEqual(provided, c.env.ADMIN_PASSWORD))) {
    return c.json({ error: "unauthorized" }, 401);
  }
  await next();
};
