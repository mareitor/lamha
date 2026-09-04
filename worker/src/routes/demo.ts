import { Hono } from "hono";
import type { DemoRecord, Env, ProgrammingEntry } from "../types";
import { putDemo, upsertIndexEntry, computeStatus } from "../lib/kv";
import { sanitizeDemo } from "../lib/sanitize";
import { requireDemoExists } from "../middleware/requireDemoExists";
import { requireNotExpired } from "../middleware/requireNotExpired";
import { requireSelfService } from "../middleware/requireSelfService";
import { generateItemId } from "../lib/ids";
import { getLogoObject } from "../lib/r2";

type Vars = { demo: DemoRecord };

export const demoRoutes = new Hono<{ Bindings: Env; Variables: Vars }>();

// GET /api/demo/:id — public given the ID. Returns the same generic
// "not_found" shape for both "never existed" (requireDemoExists 404) and
// "existed but expired" (sanitized record with status:"expired" below),
// so the unguessable-ID scheme isn't trivially probeable from outside.
demoRoutes.get("/:id", requireDemoExists, async (c) => {
  const demo = c.get("demo");
  return c.json(sanitizeDemo(demo));
});

// Logo proxy — serves the R2 object rather than exposing a public bucket
// URL. Public given the ID, same as the rest of the client surface.
demoRoutes.get("/:id/logo", requireDemoExists, async (c) => {
  const demo = c.get("demo");
  if (!demo.branding.logoStoragePath) {
    return c.json({ error: "no_logo" }, 404);
  }
  const obj = await getLogoObject(c.env, demo.branding.logoStoragePath);
  if (!obj) {
    return c.json({ error: "no_logo" }, 404);
  }
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
});

// POST /api/demo/:id/onboarding — always allowed regardless of mode; this
// is first-run setup, not "programming/budget editing" (spec 4). Mode is
// no longer client-choosable here (self-service is closed beta) — every
// demo starts and stays "managed" until admin flips it.
demoRoutes.post("/:id/onboarding", requireDemoExists, requireNotExpired, async (c) => {
  const demo = c.get("demo");
  const body = await c.req.json<{
    event?: Partial<DemoRecord["event"]>;
    paymentPolicy?: Partial<DemoRecord["paymentPolicy"]>;
  }>();

  const updated: DemoRecord = {
    ...demo,
    event: { ...demo.event, ...body.event },
    paymentPolicy: { ...demo.paymentPolicy, ...body.paymentPolicy },
    onboardingComplete: true,
  };

  await putDemo(c.env, updated);
  await upsertIndexEntry(c.env, updated);
  return c.json(sanitizeDemo(updated));
});

// PATCH /api/demo/:id/event — allowed in both modes ("their event", not
// "our programming").
demoRoutes.patch("/:id/event", requireDemoExists, requireNotExpired, async (c) => {
  const demo = c.get("demo");
  const body = await c.req.json<Partial<DemoRecord["event"]>>();
  const updated: DemoRecord = { ...demo, event: { ...demo.event, ...body } };
  await putDemo(c.env, updated);
  return c.json(sanitizeDemo(updated));
});

// PATCH /api/demo/:id/payment-policy — allowed in both modes.
demoRoutes.patch("/:id/payment-policy", requireDemoExists, requireNotExpired, async (c) => {
  const demo = c.get("demo");
  const body = await c.req.json<Partial<DemoRecord["paymentPolicy"]>>();
  const updated: DemoRecord = { ...demo, paymentPolicy: { ...demo.paymentPolicy, ...body } };
  await putDemo(c.env, updated);
  return c.json(sanitizeDemo(updated));
});

// Self-service used to be a client self-toggle (PATCH /:id/mode). It's
// now closed beta (Mario, Sept 2026): clients see the option exists but
// can no longer flip it themselves, even via a direct API call — only
// admin/:id/mode can change it now. No client-facing route exists here
// by design, same pattern as invoices below.

// GET /api/demo/:id/invoices — read-only in both modes. Invoices are
// admin/managed-team-write-only (see plan doc's flagged assumption);
// no client-facing write route exists for them by design.
demoRoutes.get("/:id/invoices", requireDemoExists, async (c) => {
  const demo = c.get("demo");
  return c.json({ invoices: demo.invoices, status: computeStatus(demo) });
});

// ---- Self-service-only routes below: programming CRUD + budget ----

demoRoutes.post(
  "/:id/programming",
  requireDemoExists,
  requireNotExpired,
  requireSelfService,
  async (c) => {
    const demo = c.get("demo");
    const body = await c.req.json<Partial<ProgrammingEntry>>();
    const entry: ProgrammingEntry = {
      id: generateItemId(),
      rosterCreativeId: body.rosterCreativeId ?? null,
      name: body.name ?? "Untitled",
      creativeField: body.creativeField ?? "",
      creativeService: body.creativeService ?? "",
      locationId: body.locationId ?? null,
      priceQuoted: body.priceQuoted ?? 0,
      currency: body.currency ?? demo.budget.currency,
      date: body.date ?? null,
      status: body.status ?? "proposed",
      notes: body.notes ?? "",
      addedBy: "client",
      updatedAt: Date.now(),
    };
    const updated: DemoRecord = { ...demo, programming: [...demo.programming, entry] };
    await putDemo(c.env, updated);
    return c.json(sanitizeDemo(updated));
  },
);

demoRoutes.patch(
  "/:id/programming/:itemId",
  requireDemoExists,
  requireNotExpired,
  requireSelfService,
  async (c) => {
    const demo = c.get("demo");
    const itemId = c.req.param("itemId");
    const body = await c.req.json<Partial<ProgrammingEntry>>();
    let found = false;
    const programming = demo.programming.map((entry) => {
      if (entry.id !== itemId) return entry;
      found = true;
      return { ...entry, ...body, id: entry.id, updatedAt: Date.now() };
    });
    if (!found) return c.json({ error: "not_found" }, 404);
    const updated: DemoRecord = { ...demo, programming };
    await putDemo(c.env, updated);
    return c.json(sanitizeDemo(updated));
  },
);

demoRoutes.delete(
  "/:id/programming/:itemId",
  requireDemoExists,
  requireNotExpired,
  requireSelfService,
  async (c) => {
    const demo = c.get("demo");
    const itemId = c.req.param("itemId");
    const updated: DemoRecord = {
      ...demo,
      programming: demo.programming.filter((entry) => entry.id !== itemId),
    };
    await putDemo(c.env, updated);
    return c.json(sanitizeDemo(updated));
  },
);

demoRoutes.patch(
  "/:id/budget",
  requireDemoExists,
  requireNotExpired,
  requireSelfService,
  async (c) => {
    const demo = c.get("demo");
    const body = await c.req.json<Partial<DemoRecord["budget"]>>();
    const updated: DemoRecord = { ...demo, budget: { ...demo.budget, ...body } };
    await putDemo(c.env, updated);
    return c.json(sanitizeDemo(updated));
  },
);
