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

export interface ProgrammingEntry {
  id: string;
  rosterArtistId: string | null;
  name: string;
  category: string;
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
  schemaVersion: 1;

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
