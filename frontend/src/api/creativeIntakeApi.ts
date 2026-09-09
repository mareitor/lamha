import { apiRequest } from "./client";
import type { ServiceHardFacts, TravelWillingness } from "../types";

// Creative self-intake (Sept 2026, schema v2 Phase 2) — public given the
// creative's own id, same trust model as a demo client link, so no
// adminPassword anywhere in this file. See worker/src/routes/creativeIntake.ts
// for the server side — every hard-fact write here is stamped
// "self_reported" (or "ai_inferred" for an AI-parsed budget) server-side,
// never trusted from what's sent.

export interface IntakeService {
  id: string;
  creativeField: string;
  serviceName: string;
  status: "active" | "inactive";
  serviceHighlight: string;
  budgetNote: string;
  hardFacts: ServiceHardFacts;
}

export interface IntakeView {
  id: string;
  displayName: string;
  // Sept 9, round 4 — display-only fallback for the welcome-screen
  // greeting: same as displayName unless that looks like a generic
  // placeholder ("Artist", "Fine art / live art"), in which case this is
  // their real contact name instead. displayName itself is untouched —
  // use greetingName only for what's shown before an edit happens.
  greetingName: string;
  // The bio they already gave us — read-only, shown once ("here's what
  // we know about you"), not editable through this flow.
  bio: string;
  travelWillingnessHint: TravelWillingness | null;
  services: IntakeService[];
}

export function getIntakeView(creativeId: string): Promise<IntakeView> {
  return apiRequest(`/api/creative-intake/${creativeId}`);
}

// Round 2 (Sept 9): let a creative fix their own display name.
export function updateDisplayName(creativeId: string, displayName: string): Promise<IntakeView> {
  return apiRequest(`/api/creative-intake/${creativeId}/profile`, {
    method: "PATCH",
    body: { displayName },
  });
}

export function setTravelWillingness(
  creativeId: string,
  travelWillingness: TravelWillingness | null,
): Promise<IntakeView> {
  return apiRequest(`/api/creative-intake/${creativeId}/travel`, {
    method: "PATCH",
    body: { travelWillingness },
  });
}

// Side-effect-free AI best-guess parse of a free-text budget answer —
// doesn't save anything, just returns a suggestion for the caller to save
// via updateService below.
export function parseBudgetText(
  creativeId: string,
  serviceId: string,
  text: string,
): Promise<{ amount: number | null; currency: string | null }> {
  return apiRequest(`/api/creative-intake/${creativeId}/services/${serviceId}/parse-budget`, {
    method: "POST",
    body: { text },
  });
}

export interface HardFactPatch {
  minimumBudget?: { value: { amount: number; currency: string } | null };
  travelWillingness?: { value: TravelWillingness | null };
  outdoorCapable?: { value: boolean | null };
  leadTimeDays?: { value: number | null };
}

export interface ServiceIntakePatch {
  serviceHighlight?: string;
  budgetNote?: string;
  hardFacts?: HardFactPatch;
}

export function updateService(creativeId: string, serviceId: string, patch: ServiceIntakePatch): Promise<IntakeView> {
  return apiRequest(`/api/creative-intake/${creativeId}/services/${serviceId}`, {
    method: "PATCH",
    body: patch,
  });
}
