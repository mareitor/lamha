import type { DemoRecord, SanitizedDemoRecord } from "../types";
import { computeStatus } from "./kv";

// Strip admin-only internals before returning a demo record to a
// client-scoped (/api/demo/:id/*) route. Never leak logoStoragePath
// (internal R2 key), createdBy, or budget (Sept 2026, Mario: internal
// cost tracking -- total budget and ops/staffing costs -- is admin-only;
// the client dashboard has no Budget section at all, so this is never
// sent down rather than just not rendered).
export function sanitizeDemo(demo: DemoRecord): SanitizedDemoRecord {
  const { branding, createdBy: _createdBy, budget: _budget, ...rest } = demo;
  const { logoStoragePath: _logoStoragePath, ...safeBranding } = branding;
  return {
    ...rest,
    status: computeStatus(demo),
    branding: safeBranding,
  };
}
