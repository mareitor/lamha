import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { requireAdmin } from "./middleware/requireAdmin";
import { adminRoutes } from "./routes/admin";
import { demoRoutes } from "./routes/demo";
import { creativeIntakeRoutes } from "./routes/creativeIntake";

const app = new Hono<{ Bindings: Env }>();

// CORS: the frontend is served from a different origin (Netlify) than
// this Worker, so every /api/* route needs it. Tightened to the demo
// subdomain in production once the custom domain is live; wide open here
// for local dev / early deploys since there's no cookie-based auth to
// protect (admin auth is a bearer token, not a cookie).
app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/", (c) => c.json({ ok: true, service: "lamha-worker" }));

app.use("/api/admin/*", requireAdmin);
app.route("/api/admin", adminRoutes);
app.route("/api/demo", demoRoutes);
// Public given the creative's own id, no admin password — see
// requireCreativeExists for the trust model (same as demo links).
app.route("/api/creative-intake", creativeIntakeRoutes);

app.notFound((c) => c.json({ error: "not_found" }, 404));

export default app;
