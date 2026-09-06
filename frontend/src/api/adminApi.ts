import { apiRequest } from "./client";
import type {
  DemoIndexEntry,
  DemoRecord,
  DemoMode,
  EventSpecs,
  PaymentPolicy,
  ProgrammingEntry,
  InvoiceEntry,
  Location,
  CreativeRegistryEntry,
} from "../types";

// Admin-scoped API — every call requires the shared admin password,
// passed as a Bearer token (see plan doc: requireAdmin middleware).

export function verifyLogin(adminPassword: string): Promise<{ ok: true }> {
  return apiRequest("/api/admin/login", { method: "POST", adminPassword });
}

export function listDemos(adminPassword: string): Promise<{ demos: DemoIndexEntry[] }> {
  return apiRequest("/api/admin/demos", { adminPassword });
}

export function resyncIndex(adminPassword: string): Promise<{ demos: DemoIndexEntry[] }> {
  return apiRequest("/api/admin/demos/resync-index", { method: "POST", adminPassword });
}

export function createDemo(
  adminPassword: string,
  data: { companyName: string; logo?: File | null; accentColor?: string | null },
): Promise<{ demo: DemoRecord; shareUrl: string; warning?: string }> {
  const form = new FormData();
  form.set("companyName", data.companyName);
  if (data.logo) form.set("logo", data.logo);
  if (data.accentColor) form.set("accentColor", data.accentColor);
  return apiRequest("/api/admin/demos", { method: "POST", body: form, adminPassword });
}

export function getDemo(adminPassword: string, id: string): Promise<DemoRecord> {
  return apiRequest(`/api/admin/demos/${id}`, { adminPassword });
}

export function updateBranding(
  adminPassword: string,
  id: string,
  data: { companyDisplayName?: string; accentColor?: string; logo?: File | null },
): Promise<DemoRecord> {
  const form = new FormData();
  if (data.companyDisplayName !== undefined) form.set("companyDisplayName", data.companyDisplayName);
  if (data.accentColor !== undefined) form.set("accentColor", data.accentColor);
  if (data.logo) form.set("logo", data.logo);
  return apiRequest(`/api/admin/demos/${id}/branding`, { method: "PATCH", body: form, adminPassword });
}

export function updateEvent(
  adminPassword: string,
  id: string,
  data: Partial<EventSpecs>,
): Promise<DemoRecord> {
  return apiRequest(`/api/admin/demos/${id}/event`, { method: "PATCH", body: data, adminPassword });
}

export function updatePaymentPolicy(
  adminPassword: string,
  id: string,
  data: Partial<PaymentPolicy>,
): Promise<DemoRecord> {
  return apiRequest(`/api/admin/demos/${id}/payment-policy`, {
    method: "PATCH",
    body: data,
    adminPassword,
  });
}

export function setMode(adminPassword: string, id: string, mode: DemoMode): Promise<DemoRecord> {
  return apiRequest(`/api/admin/demos/${id}/mode`, { method: "PATCH", body: { mode }, adminPassword });
}

export function extendDemo(
  adminPassword: string,
  id: string,
  extendByDays = 14,
): Promise<DemoRecord> {
  return apiRequest(`/api/admin/demos/${id}/extend`, {
    method: "PATCH",
    body: { extendByDays },
    adminPassword,
  });
}

export function deleteDemo(adminPassword: string, id: string): Promise<{ ok: true }> {
  return apiRequest(`/api/admin/demos/${id}`, { method: "DELETE", adminPassword });
}

export function addProgramming(
  adminPassword: string,
  id: string,
  entry: Partial<ProgrammingEntry>,
): Promise<DemoRecord> {
  return apiRequest(`/api/admin/demos/${id}/programming`, {
    method: "POST",
    body: entry,
    adminPassword,
  });
}

// Bulk import — e.g. a whole season generated up front rather than added
// one date at a time. `locationName` is resolved server-side against this
// demo's own locations by name (case-insensitive); no match just leaves
// the entry unassigned rather than failing the row.
export function importProgramming(
  adminPassword: string,
  id: string,
  entries: (Partial<ProgrammingEntry> & { locationName?: string })[],
): Promise<{ demo: DemoRecord; added: number }> {
  return apiRequest(`/api/admin/demos/${id}/programming/import`, {
    method: "POST",
    body: { entries },
    adminPassword,
  });
}

export function updateProgramming(
  adminPassword: string,
  id: string,
  itemId: string,
  entry: Partial<ProgrammingEntry>,
): Promise<DemoRecord> {
  return apiRequest(`/api/admin/demos/${id}/programming/${itemId}`, {
    method: "PATCH",
    body: entry,
    adminPassword,
  });
}

export function deleteProgramming(
  adminPassword: string,
  id: string,
  itemId: string,
): Promise<DemoRecord> {
  return apiRequest(`/api/admin/demos/${id}/programming/${itemId}`, {
    method: "DELETE",
    adminPassword,
  });
}

export function addInvoice(
  adminPassword: string,
  id: string,
  entry: Partial<InvoiceEntry>,
): Promise<DemoRecord> {
  return apiRequest(`/api/admin/demos/${id}/invoices`, { method: "POST", body: entry, adminPassword });
}

export function updateInvoice(
  adminPassword: string,
  id: string,
  itemId: string,
  entry: Partial<InvoiceEntry>,
): Promise<DemoRecord> {
  return apiRequest(`/api/admin/demos/${id}/invoices/${itemId}`, {
    method: "PATCH",
    body: entry,
    adminPassword,
  });
}

export function deleteInvoice(adminPassword: string, id: string, itemId: string): Promise<DemoRecord> {
  return apiRequest(`/api/admin/demos/${id}/invoices/${itemId}`, {
    method: "DELETE",
    adminPassword,
  });
}

// ---- Locations (Planner's Locations tab — admin-managed, client read-only) ----

export function addLocation(
  adminPassword: string,
  id: string,
  entry: Partial<Location>,
): Promise<DemoRecord> {
  return apiRequest(`/api/admin/demos/${id}/locations`, { method: "POST", body: entry, adminPassword });
}

export function updateLocation(
  adminPassword: string,
  id: string,
  itemId: string,
  entry: Partial<Location>,
): Promise<DemoRecord> {
  return apiRequest(`/api/admin/demos/${id}/locations/${itemId}`, {
    method: "PATCH",
    body: entry,
    adminPassword,
  });
}

export function deleteLocation(adminPassword: string, id: string, itemId: string): Promise<DemoRecord> {
  return apiRequest(`/api/admin/demos/${id}/locations/${itemId}`, {
    method: "DELETE",
    adminPassword,
  });
}

// ---- Creative Registry (account-wide real suppliers/creatives — not
// scoped to a demo, unlike everything above) ----

export function listCreatives(adminPassword: string): Promise<{ creatives: CreativeRegistryEntry[] }> {
  return apiRequest("/api/admin/creatives", { adminPassword });
}

export function addCreative(
  adminPassword: string,
  entry: Partial<CreativeRegistryEntry>,
): Promise<{ creatives: CreativeRegistryEntry[] }> {
  return apiRequest("/api/admin/creatives", { method: "POST", body: entry, adminPassword });
}

// Bulk import — e.g. a batch exported from a real supplier-intake form.
// Server-side dedupes by email against the live registry and returns
// which rows were skipped as duplicates, so a re-run of the same file
// is safe.
export function importCreatives(
  adminPassword: string,
  entries: Partial<CreativeRegistryEntry>[],
): Promise<{ creatives: CreativeRegistryEntry[]; added: number; skipped: string[] }> {
  return apiRequest("/api/admin/creatives/import", { method: "POST", body: { entries }, adminPassword });
}

export function updateCreative(
  adminPassword: string,
  itemId: string,
  entry: Partial<CreativeRegistryEntry>,
): Promise<{ creatives: CreativeRegistryEntry[] }> {
  return apiRequest(`/api/admin/creatives/${itemId}`, { method: "PATCH", body: entry, adminPassword });
}

// Soft delete — moves the entry to the trash (status: "archived").
// Nothing calls a hard-delete route from this app (Mario, Sept 2026:
// no in-app path should ever be able to actually erase a registry
// record) — restoreCreative below is the only way back.
export function deleteCreative(
  adminPassword: string,
  itemId: string,
): Promise<{ creatives: CreativeRegistryEntry[] }> {
  return apiRequest(`/api/admin/creatives/${itemId}`, { method: "DELETE", adminPassword });
}

export function restoreCreative(
  adminPassword: string,
  itemId: string,
): Promise<{ creatives: CreativeRegistryEntry[] }> {
  return apiRequest(`/api/admin/creatives/${itemId}`, {
    method: "PATCH",
    body: { status: "active" },
    adminPassword,
  });
}

// Irreversible, and deliberately not called anywhere in the app (see
// deleteCreative above). The worker route still exists in case a real
// "empty trash" need comes up later, but nothing in the UI reaches it —
// left here, unused, only as a note of that boundary rather than a
// dead export to trip over.
// permanentlyDeleteCreative intentionally removed from the client API.
