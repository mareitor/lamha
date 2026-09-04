import { Hono, type Context } from "hono";
import type { DemoRecord, Env, InvoiceEntry, Location, ProgrammingEntry } from "../types";
import {
  createDemo,
  deleteDemo,
  getDemo,
  getIndex,
  putDemo,
  removeIndexEntry,
  resyncIndex,
  upsertIndexEntry,
} from "../lib/kv";
import { deleteLogo, uploadLogo } from "../lib/r2";
import { generateItemId } from "../lib/ids";

type Vars = { demo: DemoRecord };

export const adminRoutes = new Hono<{ Bindings: Env; Variables: Vars }>();

// requireAdmin is applied to the whole /api/admin/* group in index.ts.

adminRoutes.post("/login", async (c) => {
  // Reaching this route at all means requireAdmin already accepted the
  // password (it runs before this handler). This exists purely so the
  // admin login screen has a cheap endpoint to POST against for UX.
  return c.json({ ok: true });
});

adminRoutes.get("/demos", async (c) => {
  const index = await getIndex(c.env);
  return c.json({ demos: index });
});

adminRoutes.post("/demos/resync-index", async (c) => {
  const index = await resyncIndex(c.env);
  return c.json({ demos: index });
});

// Create demo: multipart form { companyName, logo? (file), accentColor? }
adminRoutes.post("/demos", async (c) => {
  const body = await c.req.parseBody();
  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
  if (!companyName) {
    return c.json({ error: "companyName is required" }, 400);
  }

  const demo = await createDemo(c.env, { companyName });

  const logo = body.logo;
  if (logo instanceof File && logo.size > 0) {
    try {
      const { storagePath, publicUrl } = await uploadLogo(c.env, demo.id, logo);
      demo.branding.logoStoragePath = storagePath;
      demo.branding.logoUrl = publicUrl;
    } catch (err) {
      // Demo is already created; surface the logo failure without losing
      // the demo itself — admin can re-upload from the editor.
      return c.json(
        { demo, warning: `Demo created, but logo upload failed: ${(err as Error).message}` },
        201,
      );
    }
  }

  const accentColor = typeof body.accentColor === "string" ? body.accentColor : null;
  if (accentColor) {
    demo.branding.accentColor = accentColor;
  }

  await putDemo(c.env, demo);
  await upsertIndexEntry(c.env, demo);

  return c.json({ demo, shareUrl: `/${demo.id}` }, 201);
});

adminRoutes.get("/demos/:id", async (c) => {
  const demo = await getDemo(c.env, c.req.param("id"));
  if (!demo) return c.json({ error: "not_found" }, 404);
  return c.json(demo);
});

async function loadOr404(
  c: Context<{ Bindings: Env; Variables: Vars }>,
): Promise<DemoRecord | null> {
  const id = c.req.param("id");
  if (!id) return null;
  return getDemo(c.env, id);
}

adminRoutes.patch("/demos/:id/branding", async (c) => {
  const demo = await loadOr404(c);
  if (!demo) return c.json({ error: "not_found" }, 404);
  const body = await c.req.parseBody();

  const updated: DemoRecord = { ...demo, branding: { ...demo.branding } };
  if (typeof body.companyDisplayName === "string") {
    updated.branding.companyDisplayName = body.companyDisplayName;
  }
  if (typeof body.accentColor === "string") {
    updated.branding.accentColor = body.accentColor;
  }
  const logo = body.logo;
  if (logo instanceof File && logo.size > 0) {
    await deleteLogo(c.env, demo.branding.logoStoragePath);
    const { storagePath, publicUrl } = await uploadLogo(c.env, demo.id, logo);
    updated.branding.logoStoragePath = storagePath;
    updated.branding.logoUrl = publicUrl;
  }

  await putDemo(c.env, updated);
  await upsertIndexEntry(c.env, updated);
  return c.json(updated);
});

adminRoutes.patch("/demos/:id/event", async (c) => {
  const demo = await loadOr404(c);
  if (!demo) return c.json({ error: "not_found" }, 404);
  const body = await c.req.json<Partial<DemoRecord["event"]>>();
  const updated: DemoRecord = { ...demo, event: { ...demo.event, ...body } };
  await putDemo(c.env, updated);
  return c.json(updated);
});

adminRoutes.patch("/demos/:id/payment-policy", async (c) => {
  const demo = await loadOr404(c);
  if (!demo) return c.json({ error: "not_found" }, 404);
  const body = await c.req.json<Partial<DemoRecord["paymentPolicy"]>>();
  const updated: DemoRecord = { ...demo, paymentPolicy: { ...demo.paymentPolicy, ...body } };
  await putDemo(c.env, updated);
  return c.json(updated);
});

adminRoutes.patch("/demos/:id/mode", async (c) => {
  const demo = await loadOr404(c);
  if (!demo) return c.json({ error: "not_found" }, 404);
  const body = await c.req.json<{ mode: DemoRecord["mode"] }>();
  if (body.mode !== "managed" && body.mode !== "self-service") {
    return c.json({ error: "invalid_mode" }, 400);
  }
  const updated: DemoRecord = {
    ...demo,
    mode: body.mode,
    modeSetBy: "admin",
    modeUpdatedAt: Date.now(),
  };
  await putDemo(c.env, updated);
  await upsertIndexEntry(c.env, updated);
  return c.json(updated);
});

adminRoutes.patch("/demos/:id/extend", async (c) => {
  const demo = await loadOr404(c);
  if (!demo) return c.json({ error: "not_found" }, 404);
  type ExtendBody = { extendByDays?: number; newExpiresAt?: number };
  const body = await c.req.json<ExtendBody>().catch((): ExtendBody => ({}));
  const DAY_MS = 24 * 60 * 60 * 1000;
  const newExpiresAt =
    body.newExpiresAt ?? Date.now() + (body.extendByDays ?? 14) * DAY_MS;

  const updated: DemoRecord = {
    ...demo,
    expiresAt: newExpiresAt,
    status: "active",
  };
  await putDemo(c.env, updated);
  await upsertIndexEntry(c.env, updated);
  return c.json(updated);
});

adminRoutes.delete("/demos/:id", async (c) => {
  const demo = await getDemo(c.env, c.req.param("id"));
  if (!demo) return c.json({ error: "not_found" }, 404);
  await deleteLogo(c.env, demo.branding.logoStoragePath);
  await deleteDemo(c.env, demo.id);
  await removeIndexEntry(c.env, demo.id);
  return c.json({ ok: true });
});

// ---- Programming CRUD (admin has full control regardless of mode) ----

adminRoutes.post("/demos/:id/programming", async (c) => {
  const demo = await loadOr404(c);
  if (!demo) return c.json({ error: "not_found" }, 404);
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
    addedBy: "admin",
    updatedAt: Date.now(),
  };
  const updated: DemoRecord = { ...demo, programming: [...demo.programming, entry] };
  await putDemo(c.env, updated);
  return c.json(updated);
});

adminRoutes.patch("/demos/:id/programming/:itemId", async (c) => {
  const demo = await loadOr404(c);
  if (!demo) return c.json({ error: "not_found" }, 404);
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
  return c.json(updated);
});

adminRoutes.delete("/demos/:id/programming/:itemId", async (c) => {
  const demo = await loadOr404(c);
  if (!demo) return c.json({ error: "not_found" }, 404);
  const itemId = c.req.param("itemId");
  const updated: DemoRecord = {
    ...demo,
    programming: demo.programming.filter((entry) => entry.id !== itemId),
  };
  await putDemo(c.env, updated);
  return c.json(updated);
});

// ---- Locations CRUD (admin-managed venue profiles for the Planner's
// Locations tab — clients see these read-only, in both modes) ----

adminRoutes.post("/demos/:id/locations", async (c) => {
  const demo = await loadOr404(c);
  if (!demo) return c.json({ error: "not_found" }, 404);
  const body = await c.req.json<Partial<Location>>();
  const entry: Location = {
    id: generateItemId(),
    name: body.name ?? "Untitled location",
    formats: body.formats ?? [],
    whyItWorks: body.whyItWorks ?? "",
  };
  const updated: DemoRecord = { ...demo, locations: [...demo.locations, entry] };
  await putDemo(c.env, updated);
  return c.json(updated);
});

adminRoutes.patch("/demos/:id/locations/:itemId", async (c) => {
  const demo = await loadOr404(c);
  if (!demo) return c.json({ error: "not_found" }, 404);
  const itemId = c.req.param("itemId");
  const body = await c.req.json<Partial<Location>>();
  let found = false;
  const locations = demo.locations.map((entry) => {
    if (entry.id !== itemId) return entry;
    found = true;
    return { ...entry, ...body, id: entry.id };
  });
  if (!found) return c.json({ error: "not_found" }, 404);
  const updated: DemoRecord = { ...demo, locations };
  await putDemo(c.env, updated);
  return c.json(updated);
});

adminRoutes.delete("/demos/:id/locations/:itemId", async (c) => {
  const demo = await loadOr404(c);
  if (!demo) return c.json({ error: "not_found" }, 404);
  const itemId = c.req.param("itemId");
  const updated: DemoRecord = {
    ...demo,
    locations: demo.locations.filter((entry) => entry.id !== itemId),
    // Unlink any programming entries pointed at the removed location
    // rather than leaving a dangling ID around.
    programming: demo.programming.map((entry) =>
      entry.locationId === itemId ? { ...entry, locationId: null } : entry,
    ),
  };
  await putDemo(c.env, updated);
  return c.json(updated);
});

// ---- Invoice CRUD (admin/managed-team-only writes — see plan doc) ----

adminRoutes.post("/demos/:id/invoices", async (c) => {
  const demo = await loadOr404(c);
  if (!demo) return c.json({ error: "not_found" }, 404);
  const body = await c.req.json<Partial<InvoiceEntry>>();
  const now = Date.now();
  const entry: InvoiceEntry = {
    id: generateItemId(),
    label: body.label ?? "Untitled invoice",
    amount: body.amount ?? 0,
    currency: body.currency ?? demo.budget.currency,
    dueDate: body.dueDate ?? "",
    status: body.status ?? "draft",
    linkedProgrammingIds: body.linkedProgrammingIds ?? [],
    createdAt: now,
    updatedAt: now,
  };
  const updated: DemoRecord = { ...demo, invoices: [...demo.invoices, entry] };
  await putDemo(c.env, updated);
  return c.json(updated);
});

adminRoutes.patch("/demos/:id/invoices/:itemId", async (c) => {
  const demo = await loadOr404(c);
  if (!demo) return c.json({ error: "not_found" }, 404);
  const itemId = c.req.param("itemId");
  const body = await c.req.json<Partial<InvoiceEntry>>();
  let found = false;
  const invoices = demo.invoices.map((entry) => {
    if (entry.id !== itemId) return entry;
    found = true;
    return { ...entry, ...body, id: entry.id, updatedAt: Date.now() };
  });
  if (!found) return c.json({ error: "not_found" }, 404);
  const updated: DemoRecord = { ...demo, invoices };
  await putDemo(c.env, updated);
  return c.json(updated);
});

adminRoutes.delete("/demos/:id/invoices/:itemId", async (c) => {
  const demo = await loadOr404(c);
  if (!demo) return c.json({ error: "not_found" }, 404);
  const itemId = c.req.param("itemId");
  const updated: DemoRecord = {
    ...demo,
    invoices: demo.invoices.filter((entry) => entry.id !== itemId),
  };
  await putDemo(c.env, updated);
  return c.json(updated);
});
