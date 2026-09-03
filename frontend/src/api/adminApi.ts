import { apiRequest } from "./client";
import type {
  DemoIndexEntry,
  DemoRecord,
  DemoMode,
  EventSpecs,
  PaymentPolicy,
  ProgrammingEntry,
  InvoiceEntry,
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
