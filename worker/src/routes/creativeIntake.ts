import { Hono, type Context } from "hono";
import type { CreativeRegistryEntry, Env, TravelWillingness } from "../types";
import { getCreativeRegistry, migrateCreativeToServices, putCreativeRegistry } from "../lib/kv";
import { requireCreativeExists } from "../middleware/requireCreativeExists";

// Creative self-intake (Sept 2026, schema v2 Phase 2) — Mario's ask: "why
// don't we reach out to the creatives and ask them?" instead of his team
// hand-filling every hard fact. Public given the creative's own id (see
// requireCreativeExists), no admin password — same trust model as a demo
// client link. Every write from this route group is stamped
// source: "self_reported" SERVER-SIDE, never trusted from the client body
// — a creative can never claim to be "team_verified".
//
// Deliberately narrow: this can only ever touch a service's hardFacts
// (never creativeField/serviceName/status/workDescription/curatorNote/
// verifiedFacts — those stay admin-only, reached through /api/admin/*).

type Vars = { creative: CreativeRegistryEntry };

export const creativeIntakeRoutes = new Hono<{ Bindings: Env; Variables: Vars }>();

// Client-safe view: only what the creative needs to answer questions
// about their own services. Never includes contactName/email/phone/
// whatsapp/price notes/technical requirements/curatorNote/verifiedFacts
// — those are Mario's team's internal fields, not the creative's to see.
// Migrates in-memory (not persisted) so this works even before the
// one-time bulk migration route has been run on this entry.
function toIntakeView(raw: CreativeRegistryEntry) {
  const creative = migrateCreativeToServices(raw);
  const services = creative.services ?? [];
  return {
    id: creative.id,
    displayName: creative.displayName,
    // Pre-fill hint for the "asked once, applies to everything" travel
    // question — inferred from whichever service was answered first,
    // since there's no separate profile-level hard fact for this (a
    // deliberate simplification: writing the same answer to every
    // service reuses the existing per-service Fact<T> model as-is,
    // rather than inventing a profile-level default + per-service
    // override resolution that nothing downstream reads yet).
    travelWillingnessHint: services.find((s) => s.hardFacts.travelWillingness.value != null)?.hardFacts
      .travelWillingness.value ?? null,
    services: services.map((s) => ({
      id: s.id,
      creativeField: s.creativeField,
      serviceName: s.serviceName,
      status: s.status,
      workDescription: s.workDescription,
      hardFacts: s.hardFacts,
    })),
  };
}

async function loadOr404(
  c: Context<{ Bindings: Env; Variables: Vars }>,
): Promise<{ registry: CreativeRegistryEntry[]; creative: CreativeRegistryEntry } | null> {
  const creative = c.get("creative");
  const registry = await getCreativeRegistry(c.env);
  const stillThere = registry.find((e) => e.id === creative.id && e.status !== "archived");
  if (!stillThere) return null;
  return { registry, creative: stillThere };
}

creativeIntakeRoutes.get("/:creativeId", requireCreativeExists, async (c) => {
  return c.json(toIntakeView(c.get("creative")));
});

// Applies (or clears) travel willingness across every one of this
// creative's services in one call — the "ask once" shortcut. A creative
// can still customize a single service afterward via the per-service
// route below.
creativeIntakeRoutes.patch("/:creativeId/travel", requireCreativeExists, async (c) => {
  const loaded = await loadOr404(c);
  if (!loaded) return c.json({ error: "not_found" }, 404);
  const body = await c.req
    .json<{ travelWillingness?: TravelWillingness | null }>()
    .catch((): { travelWillingness?: TravelWillingness | null } => ({}));
  if (
    body.travelWillingness !== null &&
    body.travelWillingness !== "local" &&
    body.travelWillingness !== "regional" &&
    body.travelWillingness !== "worldwide"
  ) {
    return c.json({ error: "travelWillingness must be 'local', 'regional', 'worldwide', or null" }, 400);
  }

  const now = Date.now();
  const migrated = migrateCreativeToServices(loaded.creative);
  const updatedCreative: CreativeRegistryEntry = {
    ...migrated,
    services: (migrated.services ?? []).map((s) => ({
      ...s,
      hardFacts: {
        ...s.hardFacts,
        travelWillingness: { value: body.travelWillingness ?? null, source: "self_reported", updatedAt: now },
      },
      updatedAt: now,
    })),
    updatedAt: now,
  };
  const result = loaded.registry.map((e) => (e.id === updatedCreative.id ? updatedCreative : e));
  await putCreativeRegistry(c.env, result);
  return c.json(toIntakeView(updatedCreative));
});

interface HardFactPatch {
  minimumBudget?: { value: { amount: number; currency: string } | null };
  travelWillingness?: { value: TravelWillingness | null };
  outdoorCapable?: { value: boolean | null };
  leadTimeDays?: { value: number | null };
}

creativeIntakeRoutes.patch("/:creativeId/services/:serviceId", requireCreativeExists, async (c) => {
  const loaded = await loadOr404(c);
  if (!loaded) return c.json({ error: "not_found" }, 404);
  const serviceId = c.req.param("serviceId");
  const body = await c.req.json<{ hardFacts?: HardFactPatch }>().catch((): { hardFacts?: HardFactPatch } => ({}));

  const now = Date.now();
  const migrated = migrateCreativeToServices(loaded.creative);
  let found = false;
  const services = (migrated.services ?? []).map((service) => {
    if (service.id !== serviceId) return service;
    found = true;
    const patch = body.hardFacts ?? {};
    return {
      ...service,
      hardFacts: {
        minimumBudget: patch.minimumBudget
          ? { value: patch.minimumBudget.value, source: "self_reported" as const, updatedAt: now }
          : service.hardFacts.minimumBudget,
        travelWillingness: patch.travelWillingness
          ? { value: patch.travelWillingness.value, source: "self_reported" as const, updatedAt: now }
          : service.hardFacts.travelWillingness,
        outdoorCapable: patch.outdoorCapable
          ? { value: patch.outdoorCapable.value, source: "self_reported" as const, updatedAt: now }
          : service.hardFacts.outdoorCapable,
        leadTimeDays: patch.leadTimeDays
          ? { value: patch.leadTimeDays.value, source: "self_reported" as const, updatedAt: now }
          : service.hardFacts.leadTimeDays,
      },
      updatedAt: now,
    };
  });
  if (!found) return c.json({ error: "not_found" }, 404);

  const updatedCreative: CreativeRegistryEntry = { ...migrated, services, updatedAt: now };
  const result = loaded.registry.map((e) => (e.id === updatedCreative.id ? updatedCreative : e));
  await putCreativeRegistry(c.env, result);
  return c.json(toIntakeView(updatedCreative));
});
