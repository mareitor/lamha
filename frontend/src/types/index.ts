// Mirrors worker/src/types/index.ts. Kept as a manually-synced copy per
// the plan doc (v1: manual is fine — two small packages, no shared build
// step between them by design).

export type DemoMode = "managed" | "self-service";
export type DemoStatus = "active" | "expired" | "archived";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type ProgrammingStatus = "proposed" | "confirmed" | "cancelled";

export interface Branding {
  logoUrl: string | null;
  accentColor: string | null;
  companyDisplayName: string;
}

export interface EventSpecs {
  eventName: string;
  description: string;
  startDate: string;
  endDate: string;
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

// A reusable venue profile for the season — the Planner's Locations tab.
export interface Location {
  id: string;
  name: string;
  formats: string[];
  whyItWorks: string;
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

// Client-facing sanitized shape (what GET /api/demo/:id returns).
export interface DemoRecord {
  id: string;
  schemaVersion: 2;
  companyName: string;
  createdAt: number;
  expiresAt: number;
  status: DemoStatus;
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

export interface DemoIndexEntry {
  id: string;
  companyName: string;
  createdAt: number;
  expiresAt: number;
  mode: DemoMode;
  status: DemoStatus;
}

// The real supplier/creative database — account-wide, not per-demo.
// Admin-only (no client route reads this today). See worker's mirror of
// this type for the internal-vs-client-safe field split.
// "archived" = soft-deleted — hidden from the default list, kept and
// restorable from the admin UI's Trash view.
export type CreativeRegistryStatus = "active" | "inactive" | "archived";

export interface CreativeRegistryEntry {
  id: string;
  status: CreativeRegistryStatus;
  archivedAt: number | null;

  displayName: string;
  creativeFields: string[];
  creativeServices: string[];
  workDescription: string;
  website: string;
  socialMediaLink: string;

  // Internal only (Mario, Sept 2026) — admin UI may show these, but they
  // must never flow into a client-facing view.
  contactName: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  whatsappForBusiness: boolean | null;
  standardServicesPriceRange: string;
  technicalRequirements: string;

  addedAt: number;
  updatedAt: number;
}

// One AI-suggested creative for a demo's event brief — admin-only, never
// surfaced to a client. See the matching worker route for why this stays
// separate from a demo's (always-fictional) Programming/Season Agenda.
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

export interface RosterCreative {
  id: string;
  name: string;
  creativeField: string;
  creativeService: string;
  bioBlurb: string;
  priceRangeMin: number;
  priceRangeMax: number;
  currency: string;
  avatarStyle: {
    type: "initials";
    initials: string;
    colorSeed: string;
  };
  tags: string[];
}
