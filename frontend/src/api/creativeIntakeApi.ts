import { apiRequest } from "./client";
import type { ServiceHardFacts, TravelWillingness } from "../types";

// Creative self-intake (Sept 2026, schema v2 Phase 2) — public given the
// creative's own id, same trust model as a demo client link, so no
// adminPassword anywhere in this file. See worker/src/routes/creativeIntake.ts
// for the server side — every write here is stamped "self_reported"
// server-side, never trusted from what's sent.

export interface IntakeService {
  id: string;
  creativeField: string;
  serviceName: string;
  status: "active" | "inactive";
  workDescription: string;
  hardFacts: ServiceHardFacts;
}

export interface IntakeView {
  id: string;
  displayName: string;
  travelWillingnessHint: TravelWillingness | null;
  services: IntakeService[];
}

export function getIntakeView(creativeId: string): Promise<IntakeView> {
  return apiRequest(`/api/creative-intake/${creativeId}`);
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

export interface HardFactPatch {
  minimumBudget?: { value: { amount: number; currency: string } | null };
  travelWillingness?: { value: TravelWillingness | null };
  outdoorCapable?: { value: boolean | null };
  leadTimeDays?: { value: number | null };
}

export function updateServiceHardFacts(
  creativeId: string,
  serviceId: string,
  hardFacts: HardFactPatch,
): Promise<IntakeView> {
  return apiRequest(`/api/creative-intake/${creativeId}/services/${serviceId}`, {
    method: "PATCH",
    body: { hardFacts },
  });
}
