import type { DemoIndexEntry, DemoRecord, Env } from "../types";
import { generateDemoId } from "./ids";

const DEMO_PREFIX = "demo:";
const INDEX_KEY = "demos:index";
const DEMO_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

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
    schemaVersion: 1,
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
