// Shared shape for a single demo record, stored at KV key `demo:<id>`.
// Mirrors the schema in /root/.claude/plans (Lamha plan doc).

export type DemoMode = "managed" | "self-service";
export type DemoStatus = "active" | "expired" | "archived";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type ProgrammingStatus = "proposed" | "confirmed" | "cancelled";

export interface Branding {
  logoUrl: string | null;
  logoStoragePath: string | null;
  accentColor: string | null;
  companyDisplayName: string;
}

export interface EventSpecs {
  eventName: string;
  description: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  location: string;
  expectedAttendees: number | null;
  eventType: string;
  notes: string;
}

export interface PaymentPolicy {
  currency: string;
  paymentTermsDays: number;
  depositPercent: number;
  invoicingContactName: string;
  invoicingContactEmail: string;
  billingAddress: string;
}

// A reusable venue profile for the season — the Planner's "Locations"
// tab. Seeded with defaults on demo creation (createDemo below), fully
// admin-editable afterwards. Referenced by ProgrammingEntry.locationId.
export interface Location {
  id: string;
  name: string;
  formats: string[]; // e.g. "Indoor", "Outdoor", "Rooftop", "Lobby"
  whyItWorks: string; // short curatorial note on why this venue suits the season
}

export interface ProgrammingEntry {
  id: string;
  rosterCreativeId: string | null;
  name: string;
  creativeField: string;
  creativeService: string;
  locationId: string | null;
  priceQuoted: number;
  currency: string;
  date: string | null;
  status: ProgrammingStatus;
  notes: string;
  addedBy: "admin" | "client";
  updatedAt: number;
}

export interface Budget {
  totalBudget: number | null;
  currency: string;
}

export interface InvoiceEntry {
  id: string;
  label: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: InvoiceStatus;
  linkedProgrammingIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface DemoRecord {
  id: string;
  schemaVersion: 2;

  companyName: string;
  createdAt: number;
  expiresAt: number;
  status: DemoStatus;
  createdBy: "admin";

  mode: DemoMode;
  modeSetBy: "client" | "admin";
  modeUpdatedAt: number;

  onboardingComplete: boolean;

  branding: Branding;
  event: EventSpecs;
  paymentPolicy: PaymentPolicy;
  programming: ProgrammingEntry[];
  locations: Location[];
  budget: Budget;
  invoices: InvoiceEntry[];
}

// The real supplier/creative database — account-wide (not per-demo,
// unlike everything above), stored at KV key "creatives:registry".
// Populated from the real supplier-intake form. Contact/pricing/ops
// fields below are marked internal: they must never be sent down a
// client-facing route (none exists yet — this registry is admin-only
// until a demo's Programming picks from it, at which point only
// PublicCreativeProfile's fields may reach the client).
// "archived" = soft-deleted: hidden from the default registry view but
// kept in KV and restorable, rather than gone the moment "Remove" is
// clicked. See adminRoutes.delete("/creatives/:itemId") in routes/admin.ts.
export type CreativeRegistryStatus = "active" | "inactive" | "archived";

export interface CreativeRegistryEntry {
  id: string;
  status: CreativeRegistryStatus;
  archivedAt: number | null;

  // Client-safe if this creative is ever surfaced in a demo.
  displayName: string; // artist / studio / group / band name
  creativeFields: string[]; // multi-select, "select all that apply"
  creativeServices: string[]; // multi-select, "select at least one"
  workDescription: string; // "tell us more about your work"
  website: string;
  socialMediaLink: string;

  // Internal only (Mario, Sept 2026) — never project these into a
  // client-facing view.
  contactName: string; // the real person's name, as opposed to displayName
  email: string;
  phoneCountryCode: string;
  phone: string;
  whatsappForBusiness: boolean | null; // null = not answered
  standardServicesPriceRange: string;
  technicalRequirements: string;

  addedAt: number;
  updatedAt: number;
}

// The subset of a registry entry that's safe to ever show a client.
// Not wired into any client route yet (that lands when Programming
// starts picking from the registry) — defined now so the boundary is
// explicit from day one rather than retrofitted later.
export type PublicCreativeProfile = Pick<
  CreativeRegistryEntry,
  "id" | "displayName" | "creativeFields" | "creativeServices" | "workDescription" | "website" | "socialMediaLink"
>;

export interface DemoIndexEntry {
  id: string;
  companyName: string;
  createdAt: number;
  expiresAt: number;
  mode: DemoMode;
  status: DemoStatus;
}

// Client-facing sanitized view: strips admin-only internals
// (logoStoragePath, createdBy) before returning to /api/demo/:id routes.
export type SanitizedDemoRecord = Omit<DemoRecord, "branding" | "createdBy"> & {
  branding: Omit<Branding, "logoStoragePath">;
};

export interface Env {
  LAMHA_KV: KVNamespace;
  LAMHA_LOGOS: R2Bucket;
  ADMIN_PASSWORD: string;
  // Optional: AI-matching (POST /api/admin/demos/:id/match-creatives)
  // degrades to a clear "not configured" error when this is unset, rather
  // than throwing — see that route in routes/admin.ts.
  ANTHROPIC_API_KEY?: string;
}

// One AI-suggested creative for a demo's event brief — a live registry
// entry (client-safe fields only, plus the internal contact fields Mario
// needs to actually reach out) with the model's fit reasoning attached.
// Admin-only, never surfaced to a client: matching is Mario's own sourcing
// tool, not something that populates a demo's (always-fictional) Season
// Agenda.
export interface CreativeMatch {
  id: string;
  displayName: string;
  creativeFields: string[];
  creativeServices: string[];
  workDescription: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  whatsappForBusiness: boolean | null;
  website: string;
  socialMediaLink: string;
  fitScore: number;
  reason: string;
}
