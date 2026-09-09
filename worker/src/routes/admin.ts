import { Hono, type Context } from "hono";
import type {
  CreativeRegistryEntry,
  CreativeService,
  DemoRecord,
  Env,
  Fact,
  InvoiceEntry,
  Location,
  ProgrammingEntry,
  TravelWillingness,
  VerifiedFact,
} from "../types";
import { emptyServiceHardFacts } from "../types";
import {
  createDemo,
  deleteDemo,
  getCreativeRegistry,
  getDemo,
  getIndex,
  migrateCreativeToServices,
  putCreativeRegistry,
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

// Bulk import — e.g. a whole season generated up front (a batch of dated
// bookings) rather than added one at a time through "Add from roster".
// Each incoming row is a Partial<ProgrammingEntry> plus an optional
// `locationName`, matched case-insensitively against this demo's own
// `locations` list (seasons are generated without knowing this demo's
// actual location ids, only their default names) — no match just leaves
// locationId null rather than failing the row. Same spirit as the
// Creative Registry's bulk import: a malformed row degrades to sane
// blanks instead of throwing, so one bad row can't sink the batch.
adminRoutes.post("/demos/:id/programming/import", async (c) => {
  const demo = await loadOr404(c);
  if (!demo) return c.json({ error: "not_found" }, 404);
  const body = await c.req
    .json<{ entries?: (Partial<ProgrammingEntry> & { locationName?: string })[] }>()
    .catch((): { entries?: (Partial<ProgrammingEntry> & { locationName?: string })[] } => ({}));
  const incoming = Array.isArray(body.entries) ? body.entries : [];

  const now = Date.now();
  const added: ProgrammingEntry[] = incoming.map((raw) => {
    let locationId = raw.locationId ?? null;
    if (!locationId && raw.locationName) {
      const match = demo.locations.find(
        (l) => l.name.trim().toLowerCase() === raw.locationName!.trim().toLowerCase(),
      );
      locationId = match?.id ?? null;
    }
    return {
      id: generateItemId(),
      rosterCreativeId: raw.rosterCreativeId ?? null,
      name: raw.name ?? "Untitled",
      creativeField: raw.creativeField ?? "",
      creativeService: raw.creativeService ?? "",
      locationId,
      priceQuoted: raw.priceQuoted ?? 0,
      currency: raw.currency ?? demo.budget.currency,
      date: raw.date ?? null,
      status: raw.status ?? "proposed",
      notes: raw.notes ?? "",
      addedBy: "admin",
      updatedAt: now,
    };
  });

  const updated: DemoRecord = { ...demo, programming: [...demo.programming, ...added] };
  await putDemo(c.env, updated);
  return c.json({ demo: updated, added: added.length });
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

// ---- Creative Registry — real suppliers/creatives, account-wide, not
// scoped to a demo. Admin-only: every field here is fair game to read,
// including contact/pricing/ops fields that must never reach a
// client-facing route. Nothing client-facing references this yet — that
// lands when a demo's Programming starts picking from it. ----

adminRoutes.get("/creatives", async (c) => {
  const registry = await getCreativeRegistry(c.env);
  return c.json({ creatives: registry });
});

// Shared entry-construction so a single add (below) and a bulk import
// (further down) fill in exactly the same defaults for anything the
// caller didn't supply — a malformed or partial row from an import batch
// degrades to sane blanks instead of throwing.
function buildCreativeEntry(body: Partial<CreativeRegistryEntry>, now: number): CreativeRegistryEntry {
  return {
    id: generateItemId(),
    status: body.status ?? "active",
    archivedAt: null,
    displayName: body.displayName ?? "Untitled",
    creativeFields: Array.isArray(body.creativeFields) ? body.creativeFields : [],
    creativeServices: Array.isArray(body.creativeServices) ? body.creativeServices : [],
    workDescription: body.workDescription ?? "",
    website: body.website ?? "",
    socialMediaLink: body.socialMediaLink ?? "",
    contactName: body.contactName ?? "",
    email: body.email ?? "",
    phoneCountryCode: body.phoneCountryCode ?? "",
    phone: body.phone ?? "",
    whatsappForBusiness: body.whatsappForBusiness ?? null,
    standardServicesPriceRange: body.standardServicesPriceRange ?? "",
    technicalRequirements: body.technicalRequirements ?? "",
    // Schema v2 (Sept 2026) — profile-level curator note, settable from
    // the moment a creative is added, not just via a later edit.
    // `services` is deliberately left unset here (rather than []): that
    // ambiguity is exactly what migrateCreativeToServices's
    // Array.isArray(entry.services) check relies on to tell "never
    // touched" apart from "migrated, has none".
    curatorNote: body.curatorNote ?? null,
    verifiedFacts: Array.isArray(body.verifiedFacts) ? body.verifiedFacts : [],
    addedAt: now,
    updatedAt: now,
  };
}

adminRoutes.post("/creatives", async (c) => {
  const body = await c.req.json<Partial<CreativeRegistryEntry>>();
  const registry = await getCreativeRegistry(c.env);
  const entry = buildCreativeEntry(body, Date.now());
  registry.push(entry);
  await putCreativeRegistry(c.env, registry);
  return c.json({ creatives: registry }, 201);
});

// Bulk import (e.g. a batch of real intake-form submissions exported to
// JSON). Never throws on a bad or unrecognized field — buildCreativeEntry
// above already defaults anything missing/malformed to a blank rather
// than erroring, so one bad row can't sink the whole batch. Duplicate
// guard is email-based (case-insensitive), checked against both the
// existing live registry and entries already added earlier in this same
// batch — matches the single-add duplicate check in the admin UI.
adminRoutes.post("/creatives/import", async (c) => {
  const body = await c.req
    .json<{ entries?: Partial<CreativeRegistryEntry>[] }>()
    .catch((): { entries?: Partial<CreativeRegistryEntry>[] } => ({}));
  const incoming = Array.isArray(body.entries) ? body.entries : [];
  const registry = await getCreativeRegistry(c.env);
  const seenEmails = new Set(
    registry
      .filter((e) => e.status !== "archived")
      .map((e) => e.email.trim().toLowerCase())
      .filter(Boolean),
  );

  const now = Date.now();
  const skipped: string[] = [];
  let added = 0;
  for (const raw of incoming) {
    const email = (raw.email ?? "").trim().toLowerCase();
    if (email && seenEmails.has(email)) {
      skipped.push(raw.displayName || raw.email || "(unnamed)");
      continue;
    }
    registry.push(buildCreativeEntry(raw, now));
    if (email) seenEmails.add(email);
    added++;
  }

  await putCreativeRegistry(c.env, registry);
  return c.json({ creatives: registry, added, skipped });
});

// One-time (idempotent, safe to re-run) migration: adds the new
// per-service schema (services[]/curatorNote/verifiedFacts) to every
// registry entry that doesn't have it yet. Purely additive — see
// migrateCreativeToServices in lib/kv.ts, which never touches an entry
// that already has a `services` array. Registered as its own route
// rather than running automatically so this runs once, deliberately,
// right after the schema v2 deploy — not silently on every read.
adminRoutes.post("/creatives/migrate-to-services", async (c) => {
  const registry = await getCreativeRegistry(c.env);
  let migrated = 0;
  const result = registry.map((entry) => {
    if (Array.isArray(entry.services)) return entry;
    migrated++;
    return migrateCreativeToServices(entry);
  });
  await putCreativeRegistry(c.env, result);
  return c.json({ creatives: result, migrated });
});

// Bulk status update — flip many creatives to Active/Inactive in one call
// (e.g. Mario reviewing a big import batch and marking a filtered set
// Active at once, rather than one edit-form save per entry). Only ever
// touches status + updatedAt; every other field is left alone, and an
// already-archived (trashed) entry is skipped rather than revived —
// that stays a deliberate one-at-a-time Restore action. Registered
// before the "/creatives/:itemId" param route below so the literal path
// "bulk-status" can never be mistaken for an :itemId value.
adminRoutes.patch("/creatives/bulk-status", async (c) => {
  const body = await c.req
    .json<{ ids?: string[]; status?: "active" | "inactive" }>()
    .catch((): { ids?: string[]; status?: "active" | "inactive" } => ({}));
  const ids = Array.isArray(body.ids) ? body.ids : [];
  if (body.status !== "active" && body.status !== "inactive") {
    return c.json({ error: "status must be 'active' or 'inactive'" }, 400);
  }
  if (ids.length === 0) {
    return c.json({ error: "No ids provided" }, 400);
  }

  const idSet = new Set(ids);
  const registry = await getCreativeRegistry(c.env);
  const now = Date.now();
  let updated = 0;
  const result = registry.map((entry) => {
    if (!idSet.has(entry.id) || entry.status === "archived") return entry;
    updated++;
    return { ...entry, status: body.status!, updatedAt: now };
  });

  await putCreativeRegistry(c.env, result);
  return c.json({ creatives: result, updated });
});

adminRoutes.patch("/creatives/:itemId", async (c) => {
  const itemId = c.req.param("itemId");
  const body = await c.req.json<Partial<CreativeRegistryEntry>>();
  const registry = await getCreativeRegistry(c.env);
  let found = false;
  const updated = registry.map((entry) => {
    if (entry.id !== itemId) return entry;
    found = true;
    // Restoring from the trash (status moving away from "archived") clears
    // archivedAt; anything else leaves it alone.
    const archivedAt = body.status && body.status !== "archived" ? null : entry.archivedAt;
    return { ...entry, ...body, id: entry.id, archivedAt, updatedAt: Date.now() };
  });
  if (!found) return c.json({ error: "not_found" }, 404);
  await putCreativeRegistry(c.env, updated);
  return c.json({ creatives: updated });
});

// Soft delete: "Remove" from the registry list moves an entry to the
// trash (status: "archived") rather than erasing it, so an accidental
// or wrong removal is recoverable from the admin UI's Trash view.
adminRoutes.delete("/creatives/:itemId", async (c) => {
  const itemId = c.req.param("itemId");
  const registry = await getCreativeRegistry(c.env);
  let found = false;
  const updated = registry.map((entry) => {
    if (entry.id !== itemId) return entry;
    found = true;
    return { ...entry, status: "archived" as const, archivedAt: Date.now() };
  });
  if (!found) return c.json({ error: "not_found" }, 404);
  await putCreativeRegistry(c.env, updated);
  return c.json({ creatives: updated });
});

// Permanent delete: only reachable from the Trash view, for actually
// erasing an already-archived entry from KV. Irreversible.
adminRoutes.delete("/creatives/:itemId/permanent", async (c) => {
  const itemId = c.req.param("itemId");
  const registry = await getCreativeRegistry(c.env);
  const updated = registry.filter((entry) => entry.id !== itemId);
  await putCreativeRegistry(c.env, updated);
  return c.json({ creatives: updated });
});

// ---- Creative Services (schema v2, Sept 2026) — each service a
// creative offers is its own record with its own hard facts (see
// types/index.ts's CreativeService/Fact<T>). Every route below reads
// the target entry, migrates it in-memory first (migrateCreativeToServices
// is a no-op once an entry already has a `services` array — safe to call
// unconditionally) so these work immediately even on an entry Mario
// hasn't run the one-time migration route on yet, then writes the whole
// registry back, same pattern as the rest of this file. ----

interface ServiceHardFactPatch {
  minimumBudget?: Partial<Fact<{ amount: number; currency: string }>>;
  travelWillingness?: Partial<Fact<TravelWillingness>>;
  outdoorCapable?: Partial<Fact<boolean>>;
  leadTimeDays?: Partial<Fact<number>>;
}

interface ServicePatchBody {
  creativeField?: string;
  serviceName?: string;
  status?: "active" | "inactive";
  workDescription?: string;
  hardFacts?: ServiceHardFactPatch;
  curatorNote?: { text: string; authorName: string } | null;
  verifiedFacts?: VerifiedFact[];
}

adminRoutes.post("/creatives/:id/services", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<Partial<ServicePatchBody>>().catch((): Partial<ServicePatchBody> => ({}));
  if (!body.creativeField || !body.serviceName) {
    return c.json({ error: "creativeField and serviceName are required" }, 400);
  }

  const registry = await getCreativeRegistry(c.env);
  let found = false;
  const now = Date.now();
  const updated = registry.map((entry) => {
    if (entry.id !== id) return entry;
    found = true;
    const migrated = migrateCreativeToServices(entry);
    const service: CreativeService = {
      id: generateItemId(),
      creativeField: body.creativeField!,
      serviceName: body.serviceName!,
      status: body.status ?? "active",
      hardFacts: emptyServiceHardFacts(now),
      workDescription: body.workDescription ?? "",
      aiSemanticTags: [],
      curatorNote: null,
      verifiedFacts: [],
      addedAt: now,
      updatedAt: now,
    };
    return { ...migrated, services: [...(migrated.services ?? []), service], updatedAt: now };
  });
  if (!found) return c.json({ error: "not_found" }, 404);
  await putCreativeRegistry(c.env, updated);
  return c.json({ creatives: updated });
});

// Partial-merge for status/workDescription/field/name/hardFacts (each
// hard fact patched individually — sending travelWillingness doesn't
// clobber minimumBudget), full-replace for curatorNote/verifiedFacts
// (they're small, whole-object concepts on the client side, not worth
// a merge protocol). Every touched Fact<T> gets a fresh updatedAt.
adminRoutes.patch("/creatives/:id/services/:serviceId", async (c) => {
  const id = c.req.param("id");
  const serviceId = c.req.param("serviceId");
  const body = await c.req.json<ServicePatchBody>().catch((): ServicePatchBody => ({}));

  const registry = await getCreativeRegistry(c.env);
  let foundCreative = false;
  let foundService = false;
  const now = Date.now();
  const updated = registry.map((entry) => {
    if (entry.id !== id) return entry;
    foundCreative = true;
    const migrated = migrateCreativeToServices(entry);
    const services = (migrated.services ?? []).map((service) => {
      if (service.id !== serviceId) return service;
      foundService = true;

      const hardFacts = body.hardFacts
        ? {
            minimumBudget: body.hardFacts.minimumBudget
              ? { ...service.hardFacts.minimumBudget, ...body.hardFacts.minimumBudget, updatedAt: now }
              : service.hardFacts.minimumBudget,
            travelWillingness: body.hardFacts.travelWillingness
              ? { ...service.hardFacts.travelWillingness, ...body.hardFacts.travelWillingness, updatedAt: now }
              : service.hardFacts.travelWillingness,
            outdoorCapable: body.hardFacts.outdoorCapable
              ? { ...service.hardFacts.outdoorCapable, ...body.hardFacts.outdoorCapable, updatedAt: now }
              : service.hardFacts.outdoorCapable,
            leadTimeDays: body.hardFacts.leadTimeDays
              ? { ...service.hardFacts.leadTimeDays, ...body.hardFacts.leadTimeDays, updatedAt: now }
              : service.hardFacts.leadTimeDays,
          }
        : service.hardFacts;

      return {
        ...service,
        ...(body.creativeField !== undefined ? { creativeField: body.creativeField } : {}),
        ...(body.serviceName !== undefined ? { serviceName: body.serviceName } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.workDescription !== undefined ? { workDescription: body.workDescription } : {}),
        ...(body.curatorNote !== undefined
          ? { curatorNote: body.curatorNote ? { ...body.curatorNote, updatedAt: now } : null }
          : {}),
        ...(body.verifiedFacts !== undefined ? { verifiedFacts: body.verifiedFacts } : {}),
        hardFacts,
        updatedAt: now,
      };
    });
    return { ...migrated, services, updatedAt: now };
  });
  if (!foundCreative || !foundService) return c.json({ error: "not_found" }, 404);
  await putCreativeRegistry(c.env, updated);
  return c.json({ creatives: updated });
});

adminRoutes.delete("/creatives/:id/services/:serviceId", async (c) => {
  const id = c.req.param("id");
  const serviceId = c.req.param("serviceId");
  const registry = await getCreativeRegistry(c.env);
  let foundCreative = false;
  const now = Date.now();
  const updated = registry.map((entry) => {
    if (entry.id !== id) return entry;
    foundCreative = true;
    const migrated = migrateCreativeToServices(entry);
    return {
      ...migrated,
      services: (migrated.services ?? []).filter((s) => s.id !== serviceId),
      updatedAt: now,
    };
  });
  if (!foundCreative) return c.json({ error: "not_found" }, 404);
  await putCreativeRegistry(c.env, updated);
  return c.json({ creatives: updated });
});

// AI matching (Sept 2026): given one demo's Event brief, ask Claude to
// shortlist the best-fitting creatives from the *real* registry — Active
// only, since Inactive means Mario hasn't reviewed it yet. This is
// deliberately a sourcing tool for Mario himself: the result is never
// written into the demo record and never reaches a client-facing route,
// because every demo's own Programming/Season Agenda stays 100%
// fictional (locked decision from the original plan) — matching just
// helps Mario find real people to actually contact and book.
adminRoutes.post("/demos/:id/match-creatives", async (c) => {
  const demo = await loadOr404(c);
  if (!demo) return c.json({ error: "not_found" }, 404);

  if (!c.env.ANTHROPIC_API_KEY) {
    return c.json(
      { error: "No Anthropic API key is configured on this Worker yet — run `wrangler secret put ANTHROPIC_API_KEY` in worker/ and redeploy." },
      400,
    );
  }

  const brief = [demo.event.eventName, demo.event.eventType, demo.event.description, demo.event.notes]
    .filter((s) => s && s.trim())
    .join("\n");
  if (!brief.trim()) {
    return c.json({ error: "This demo's Event tab has no name/type/description yet — fill that in first, then try matching." }, 400);
  }

  // Service-level matching (schema v2): the candidate pool is every
  // ACTIVE service on every ACTIVE creative, not the creative profile as
  // a whole — a creative offering three services can surface up to three
  // times if more than one genuinely fits. Migrated in-memory only
  // (migrateCreativeToServices is a no-op if already migrated) so this
  // works even before Mario runs the one-time migration route, though
  // he should still run it once for stable service ids going forward.
  const registry = await getCreativeRegistry(c.env);
  const activeCreatives = registry
    .map((e) => migrateCreativeToServices(e))
    .filter((e) => e.status === "active");
  if (activeCreatives.length === 0) {
    return c.json({ error: "No Active creatives in the registry yet — review some from the Creative Registry page first." }, 400);
  }

  const candidatePairs = activeCreatives.flatMap((creative) =>
    (creative.services ?? [])
      .filter((service) => service.status === "active")
      .map((service) => ({ creative, service })),
  );
  if (candidatePairs.length === 0) {
    return c.json(
      { error: "No active creative services in the registry yet — add services to your Active creatives first." },
      400,
    );
  }

  // Client-safe-ish summary for the model — it only needs enough to judge
  // fit, not contact/pricing details (those get re-attached from the
  // registry afterwards, for Mario's own use, never sent to the model).
  const candidates = candidatePairs.map(({ creative, service }) => ({
    id: service.id,
    name: creative.displayName,
    field: service.creativeField,
    service: service.serviceName,
    description: service.workDescription,
  }));

  const prompt = `You are helping an event producer shortlist creative acts/suppliers for a specific event from their supplier database. Each candidate below is one specific SERVICE a creative offers, not their whole profile — the same creative may appear more than once if more than one of their services genuinely fits.

Event brief:
${brief}

Candidate creative services (JSON):
${JSON.stringify(candidates)}

Pick the best-fitting candidates for this event, ranked best first. Return ONLY a JSON array (no prose, no markdown code fences), each item shaped exactly as:
{"id": "<candidate id, copied exactly from the list above>", "fitScore": <integer 0-100>, "reason": "<one sentence on why this fits the event>"}

Return at most 8 candidates, and only ones that are a genuinely reasonable fit for this event — fewer than 8 is fine if fewer than 8 fit well. Never invent an id that isn't in the candidate list above.`;

  let aiText: string;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": c.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return c.json({ error: `The AI matching request failed (Anthropic returned ${res.status}). ${errText.slice(0, 300)}` }, 502);
    }
    const data = await res.json<{ content?: { type: string; text?: string }[] }>();
    aiText = data.content?.find((block) => block.type === "text")?.text ?? "";
  } catch (err) {
    return c.json({ error: `Couldn't reach the Anthropic API: ${(err as Error).message}` }, 502);
  }

  let parsed: { id: string; fitScore: number; reason: string }[];
  try {
    const cleaned = aiText.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const json: unknown = JSON.parse(cleaned);
    if (!Array.isArray(json)) throw new Error("not an array");
    parsed = json as { id: string; fitScore: number; reason: string }[];
  } catch {
    return c.json({ error: "Got a response back from the AI but couldn't make sense of it — try again." }, 502);
  }

  const byServiceId = new Map(candidatePairs.map((pair) => [pair.service.id, pair]));
  const matches = parsed
    .filter((m) => byServiceId.has(m.id))
    .map((m) => {
      const { creative, service } = byServiceId.get(m.id)!;
      return {
        creativeId: creative.id,
        serviceId: service.id,
        displayName: creative.displayName,
        creativeField: service.creativeField,
        serviceName: service.serviceName,
        workDescription: service.workDescription,
        curatorNote: service.curatorNote?.text ?? creative.curatorNote?.text ?? null,
        email: creative.email,
        phoneCountryCode: creative.phoneCountryCode,
        phone: creative.phone,
        whatsappForBusiness: creative.whatsappForBusiness,
        website: creative.website,
        socialMediaLink: creative.socialMediaLink,
        fitScore: Math.max(0, Math.min(100, Math.round(m.fitScore ?? 0))),
        reason: m.reason ?? "",
      };
    });

  return c.json({ matches });
});
