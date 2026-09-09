import type { CreativeRegistryEntry, CreativeService, Env, DemoIndexEntry, DemoRecord } from "../types";
import { emptyServiceHardFacts } from "../types";
import { generateDemoId, generateItemId } from "./ids";
import { fieldForService } from "./creativeTaxonomy";

const DEMO_PREFIX = "demo:";
const INDEX_KEY = "demos:index";
const DEMO_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

// Account-wide creative/supplier registry — one JSON array under a
// single key, same shallow-storage approach as demos:index. Not
// per-demo: this is Mario's real supplier database, shared across every
// demo, unlike everything keyed under DEMO_PREFIX.
const CREATIVE_REGISTRY_KEY = "creatives:registry";

export async function getCreativeRegistry(env: Env): Promise<CreativeRegistryEntry[]> {
  const raw = await env.LAMHA_KV.get(CREATIVE_REGISTRY_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as CreativeRegistryEntry[];
}

export async function putCreativeRegistry(env: Env, registry: CreativeRegistryEntry[]): Promise<void> {
  await env.LAMHA_KV.put(CREATIVE_REGISTRY_KEY, JSON.stringify(registry));
}

// Schema v2 migration (Sept 2026) — additive and idempotent. An entry
// with `services` already set (even an empty array — that's a
// deliberate "migrated, has no services" state) is left completely
// untouched; nothing here ever deletes or overwrites a legacy field.
// Each legacy `creativeServices` entry becomes its own CreativeService,
// starting with every hard fact at "unknown" — we can't reliably invent
// a real minimum budget out of the old free-text price notes, and
// guessing would violate the whole point of the trust-tier model (see
// types/index.ts's Fact<T>). `creativeField` is resolved via the
// taxonomy map where possible, falling back to the creative's first
// listed field, then "Uncategorized" as a last resort.
export function migrateCreativeToServices(entry: CreativeRegistryEntry): CreativeRegistryEntry {
  if (Array.isArray(entry.services)) return entry;

  const now = Date.now();
  const legacyServiceNames = entry.creativeServices ?? [];
  const services: CreativeService[] = legacyServiceNames.map((serviceName) => ({
    id: generateItemId(),
    creativeField: fieldForService(serviceName) ?? entry.creativeFields?.[0] ?? "Uncategorized",
    serviceName,
    status: entry.status === "archived" ? "inactive" : (entry.status as "active" | "inactive"),
    hardFacts: emptyServiceHardFacts(now),
    workDescription: entry.workDescription ?? "",
    budgetNote: "",
    aiSemanticTags: [],
    curatorNote: null,
    verifiedFacts: [],
    addedAt: entry.addedAt,
    updatedAt: now,
  }));

  return {
    ...entry,
    services,
    curatorNote: entry.curatorNote ?? null,
    verifiedFacts: entry.verifiedFacts ?? [],
  };
}

function demoKey(id: string): string {
  return `${DEMO_PREFIX}${id}`;
}

export async function getDemo(env: Env, id: string): Promise<DemoRecord | null> {
  const raw = await env.LAMHA_KV.get(demoKey(id));
  if (!raw) return null;
  return JSON.parse(raw) as DemoRecord;
}

export async function putDemo(env: Env, demo: DemoRecord): Promise<void> {
  await env.LAMHA_KV.put(demoKey(demo.id), JSON.stringify(demo));
}

export async function deleteDemo(env: Env, id: string): Promise<void> {
  await env.LAMHA_KV.delete(demoKey(id));
}

export async function getIndex(env: Env): Promise<DemoIndexEntry[]> {
  const raw = await env.LAMHA_KV.get(INDEX_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as DemoIndexEntry[];
}

async function putIndex(env: Env, index: DemoIndexEntry[]): Promise<void> {
  await env.LAMHA_KV.put(INDEX_KEY, JSON.stringify(index));
}

function toIndexEntry(demo: DemoRecord): DemoIndexEntry {
  return {
    id: demo.id,
    companyName: demo.companyName,
    createdAt: demo.createdAt,
    expiresAt: demo.expiresAt,
    mode: demo.mode,
    status: demo.status,
  };
}

// Write-through index maintenance. `demo:<id>` is the source of truth;
// `demos:index` is a denormalized cache for the admin list view, kept in
// sync here. If this fails after the demo record already wrote
// successfully, the demo still exists (just unlisted) — callers can
// recover via resyncIndex().
export async function upsertIndexEntry(env: Env, demo: DemoRecord): Promise<void> {
  const index = await getIndex(env);
  const entry = toIndexEntry(demo);
  const existingPos = index.findIndex((e) => e.id === demo.id);
  if (existingPos >= 0) {
    index[existingPos] = entry;
  } else {
    index.unshift(entry); // newest first
  }
  await putIndex(env, index);
}

export async function removeIndexEntry(env: Env, id: string): Promise<void> {
  const index = await getIndex(env);
  await putIndex(
    env,
    index.filter((e) => e.id !== id),
  );
}

// Admin repair tool: rebuild demos:index from scratch by listing every
// demo:* key and re-reading each record. Use if the index ever drifts.
export async function resyncIndex(env: Env): Promise<DemoIndexEntry[]> {
  const rebuilt: DemoIndexEntry[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.LAMHA_KV.list({ prefix: DEMO_PREFIX, cursor });
    for (const key of page.keys) {
      const raw = await env.LAMHA_KV.get(key.name);
      if (!raw) continue;
      const demo = JSON.parse(raw) as DemoRecord;
      rebuilt.push(toIndexEntry(demo));
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  rebuilt.sort((a, b) => b.createdAt - a.createdAt);
  await putIndex(env, rebuilt);
  return rebuilt;
}

export function computeStatus(demo: Pick<DemoRecord, "expiresAt" | "status">): "active" | "expired" {
  if (demo.status === "archived") return "expired";
  return Date.now() >= demo.expiresAt ? "expired" : "active";
}

export function isExpired(demo: Pick<DemoRecord, "expiresAt">): boolean {
  return Date.now() >= demo.expiresAt;
}

interface CreateDemoInput {
  companyName: string;
  companyDisplayName?: string;
}

// Seeded onto every new demo so Locations isn't an empty tab on day
// one — generic enough to suit most Riyadh-area engagements, fully
// editable/replaceable per demo from the admin console afterwards.
function defaultLocations(): DemoRecord["locations"] {
  return [
    {
      id: generateItemId(),
      name: "KAFD Plaza",
      formats: ["Outdoor", "Plaza"],
      whyItWorks: "High-footfall business district plaza — strong for opening-week visibility.",
    },
    {
      id: generateItemId(),
      name: "Riyadh Front",
      formats: ["Outdoor", "Waterfront"],
      whyItWorks: "Evening/weekend crowds, wide open sightlines — good for large-format or light work.",
    },
    {
      id: generateItemId(),
      name: "U Walk",
      formats: ["Outdoor", "Retail promenade"],
      whyItWorks: "Retail foot traffic all day — good fit for shorter, high-turnover activations.",
    },
    {
      id: generateItemId(),
      name: "Salam Park",
      formats: ["Outdoor", "Park"],
      whyItWorks: "Family-oriented weekend crowds — a natural home for interactive or live-performance acts.",
    },
  ];
}

export async function createDemo(env: Env, input: CreateDemoInput): Promise<DemoRecord> {
  // Collision check against the index (astronomically unlikely at this
  // scale, but cheap since the index is already being read for create).
  const index = await getIndex(env);
  let id = generateDemoId();
  while (index.some((e) => e.id === id)) {
    id = generateDemoId();
  }

  const now = Date.now();
  const demo: DemoRecord = {
    id,
    schemaVersion: 2,
    companyName: input.companyName,
    createdAt: now,
    expiresAt: now + DEMO_TTL_MS,
    status: "active",
    createdBy: "admin",
    mode: "managed",
    modeSetBy: "admin",
    modeUpdatedAt: now,
    onboardingComplete: false,
    branding: {
      logoUrl: null,
      logoStoragePath: null,
      accentColor: null,
      companyDisplayName: input.companyDisplayName ?? input.companyName,
    },
    event: {
      eventName: "",
      description: "",
      startDate: "",
      endDate: "",
      location: "",
      expectedAttendees: null,
      eventType: "",
      notes: "",
    },
    paymentPolicy: {
      currency: "SAR",
      paymentTermsDays: 30,
      depositPercent: 50,
      invoicingContactName: "",
      invoicingContactEmail: "",
      billingAddress: "",
    },
    programming: [],
    locations: defaultLocations(),
    budget: {
      totalBudget: null,
      currency: "SAR",
    },
    invoices: [],
  };

  await putDemo(env, demo);
  await upsertIndexEntry(env, demo);
  return demo;
}

export const DEMO_TTL_MS_EXPORT = DEMO_TTL_MS;
