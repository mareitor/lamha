import { apiRequest } from "./client";
import type { DemoRecord, EventSpecs, PaymentPolicy, ProgrammingEntry, Budget } from "../types";

// Client-scoped API — every call is authorized purely by the demo ID in
// the URL (see plan doc: unguessable-ID-as-auth). Self-service-only
// routes are still enforced server-side even though the UI also hides
// them in managed mode. Mode itself has no client-facing route at all —
// self-service is closed beta, admin-only (see adminApi.setMode).

export function getDemo(demoId: string): Promise<DemoRecord> {
  return apiRequest(`/api/demo/${demoId}`);
}

export function submitOnboarding(
  demoId: string,
  data: { event: Partial<EventSpecs>; paymentPolicy: Partial<PaymentPolicy> },
): Promise<DemoRecord> {
  return apiRequest(`/api/demo/${demoId}/onboarding`, { method: "POST", body: data });
}

export function updateEvent(demoId: string, data: Partial<EventSpecs>): Promise<DemoRecord> {
  return apiRequest(`/api/demo/${demoId}/event`, { method: "PATCH", body: data });
}

export function updatePaymentPolicy(demoId: string, data: Partial<PaymentPolicy>): Promise<DemoRecord> {
  return apiRequest(`/api/demo/${demoId}/payment-policy`, { method: "PATCH", body: data });
}

export function getInvoices(demoId: string) {
  return apiRequest<{ invoices: DemoRecord["invoices"]; status: DemoRecord["status"] }>(
    `/api/demo/${demoId}/invoices`,
  );
}

// Self-service only (server rejects with 403 if the demo is in managed mode)

export function addProgramming(
  demoId: string,
  entry: Partial<ProgrammingEntry>,
): Promise<DemoRecord> {
  return apiRequest(`/api/demo/${demoId}/programming`, { method: "POST", body: entry });
}

export function updateProgramming(
  demoId: string,
  itemId: string,
  entry: Partial<ProgrammingEntry>,
): Promise<DemoRecord> {
  return apiRequest(`/api/demo/${demoId}/programming/${itemId}`, { method: "PATCH", body: entry });
}

export function deleteProgramming(demoId: string, itemId: string): Promise<DemoRecord> {
  return apiRequest(`/api/demo/${demoId}/programming/${itemId}`, { method: "DELETE" });
}

export function updateBudget(demoId: string, data: Partial<Budget>): Promise<DemoRecord> {
  return apiRequest(`/api/demo/${demoId}/budget`, { method: "PATCH", body: data });
}
