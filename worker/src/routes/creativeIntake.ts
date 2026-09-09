import { Hono, type Context } from "hono";
import type { CreativeRegistryEntry, Env, TravelWillingness } from "../types";
import { getCreativeRegistry, migrateCreativeToServices, putCreativeRegistry } from "../lib/kv";
import { requireCreativeExists } from "../middleware/requireCreativeExists";

// Creative self-intake (Sept 2026, schema v2 Phase 2) — Mario's ask: "why
// don't we reach out to the creatives and ask them?" instead of his team
// hand-filling every hard fact. Public given the creative's own id (see
// requireCreativeExists), no admin password — same trust model as a demo
// client link. Every hard-fact write from this route group is stamped
// source: "self_reported" (or "ai_inferred" for an AI-parsed budget
// guess) SERVER-SIDE, never trusted from the client body — a creative can
// never claim to be "team_verified".
//
// Round 2 (Sept 9, Mario's feedback after the first version shipped):
// also lets a creative edit their own display name and each service's
// work description (plain text, not a trust-tiered hard fact — same
// "saves immediately" model as everything else here), and adds a
// free-text "describe your budget instead" path with a best-effort AI
// parse. Deliberately still narrow: creativeField/serviceName (the
// taxonomy selection), status, curatorNote, and verifiedFacts stay
// admin-only, reached through /api/admin/*.

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
      budgetNote: s.budgetNote ?? "",
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

// Editing their own name (Mario's feedback, round 2) — saves immediately,
// same model as everything else in this flow. Deliberately its own tiny
// route rather than folded into a bigger "profile" patch, since it's the
// only profile-level (not per-service) field a creative can touch.
creativeIntakeRoutes.patch("/:creativeId/profile", requireCreativeExists, async (c) => {
  const loaded = await loadOr404(c);
  if (!loaded) return c.json({ error: "not_found" }, 404);
  const body = await c.req.json<{ displayName?: string }>().catch((): { displayName?: string } => ({}));
  const displayName = (body.displayName ?? "").trim();
  if (!displayName) return c.json({ error: "Name can't be empty" }, 400);
  if (displayName.length > 120) return c.json({ error: "That name's a bit long — keep it under 120 characters" }, 400);

  const now = Date.now();
  const migrated = migrateCreativeToServices(loaded.creative);
  const updatedCreative: CreativeRegistryEntry = { ...migrated, displayName, updatedAt: now };
  const result = loaded.registry.map((e) => (e.id === updatedCreative.id ? updatedCreative : e));
  await putCreativeRegistry(c.env, result);
  return c.json(toIntakeView(updatedCreative));
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

// AI best-guess parse of a free-text budget answer (Mario's feedback,
// round 2: "sometimes it is hard to say [a number]"). Side-effect-free —
// this never saves anything, it just returns a guess for the frontend to
// use when it saves via the PATCH route below. Degrades to {amount:
// null, currency: null} on any failure (no API key configured, network
// error, or a response that doesn't parse) rather than ever throwing —
// the creative's raw text is saved regardless of whether parsing worked.
creativeIntakeRoutes.post("/:creativeId/services/:serviceId/parse-budget", requireCreativeExists, async (c) => {
  const loaded = await loadOr404(c);
  if (!loaded) return c.json({ error: "not_found" }, 404);
  const serviceId = c.req.param("serviceId");
  const migrated = migrateCreativeToServices(loaded.creative);
  const service = (migrated.services ?? []).find((s) => s.id === serviceId);
  if (!service) return c.json({ error: "not_found" }, 404);

  const body = await c.req.json<{ text?: string }>().catch((): { text?: string } => ({}));
  const text = (body.text ?? "").trim();
  if (!text || !c.env.ANTHROPIC_API_KEY) {
    return c.json({ amount: null, currency: null });
  }

  const prompt = `A creative professional was asked for their usual minimum budget for "${service.serviceName}" and wrote a free-text answer instead of a plain number. Extract a single best-guess minimum budget as a number and a 3-letter currency code, only if one can reasonably be inferred. If it's genuinely unclear (e.g. "depends on the event" with no anchor number anywhere), return null for both — never invent a number that isn't grounded in what they wrote.

Their answer: "${text}"

Return ONLY JSON, no prose, no markdown code fences, shaped exactly as: {"amount": <number or null>, "currency": "<3-letter code like SAR/USD/AED, or null>"}`;

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
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return c.json({ amount: null, currency: null });
    const data = await res.json<{ content?: { type: string; text?: string }[] }>();
    const aiText = data.content?.find((block) => block.type === "text")?.text ?? "";
    const cleaned = aiText.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned) as { amount?: unknown; currency?: unknown };
    return c.json({
      amount: typeof parsed.amount === "number" && Number.isFinite(parsed.amount) ? parsed.amount : null,
      currency: typeof parsed.currency === "string" && parsed.currency.trim() ? parsed.currency.trim() : null,
    });
  } catch {
    return c.json({ amount: null, currency: null });
  }
});

interface HardFactPatch {
  minimumBudget?: { value: { amount: number; currency: string } | null };
  travelWillingness?: { value: TravelWillingness | null };
  outdoorCapable?: { value: boolean | null };
  leadTimeDays?: { value: number | null };
}

interface ServiceIntakePatchBody {
  workDescription?: string;
  budgetNote?: string;
  hardFacts?: HardFactPatch;
}

creativeIntakeRoutes.patch("/:creativeId/services/:serviceId", requireCreativeExists, async (c) => {
  const loaded = await loadOr404(c);
  if (!loaded) return c.json({ error: "not_found" }, 404);
  const serviceId = c.req.param("serviceId");
  const body = await c.req.json<ServiceIntakePatchBody>().catch((): ServiceIntakePatchBody => ({}));

  const now = Date.now();
  const migrated = migrateCreativeToServices(loaded.creative);
  let found = false;
  const services = (migrated.services ?? []).map((service) => {
    if (service.id !== serviceId) return service;
    found = true;
    const patch = body.hardFacts ?? {};
    // A minimumBudget arriving alongside a non-empty budgetNote means it
    // came from the "describe it instead" free-text + AI-parse path, not
    // a number they typed directly — tag it ai_inferred so the (not yet
    // built) feasibility filter only ever downweights on it, never
    // hard-excludes a real candidate over a possible mis-parse. See the
    // Fact<T> trust-tier rule in types/index.ts.
    const budgetFromFreeText = typeof body.budgetNote === "string" && body.budgetNote.trim().length > 0;
    return {
      ...service,
      ...(body.workDescription !== undefined ? { workDescription: body.workDescription } : {}),
      ...(body.budgetNote !== undefined ? { budgetNote: body.budgetNote } : {}),
      hardFacts: {
        minimumBudget: patch.minimumBudget
          ? {
              value: patch.minimumBudget.value,
              source: (budgetFromFreeText ? "ai_inferred" : "self_reported") as const,
              updatedAt: now,
            }
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
