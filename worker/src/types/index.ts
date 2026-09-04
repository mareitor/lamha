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
}
