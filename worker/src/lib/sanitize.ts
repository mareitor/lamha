import type { DemoRecord, SanitizedDemoRecord } from "../types";
import { computeStatus } from "./kv";

// Strip admin-only internals before returning a demo record to a
// client-scoped (/api/demo/:id/*) route. Never leak logoStoragePath
// (internal R2 key) or createdBy.
export function sanitizeDemo(demo: DemoRecord): SanitizedDemoRecord {
  const { branding, createdBy: _createdBy, ...rest } = demo;
  const { logoStoragePath: _logoStoragePath, ...safeBranding } = branding;
  return {
    ...rest,
    status: computeStatus(demo),
    branding: safeBranding,
  };
}
