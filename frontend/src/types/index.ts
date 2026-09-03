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

// Client-facing sanitized shape (what GET /api/demo/:id returns).
export interface DemoRecord {
  id: string;
  schemaVersion: 1;
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

export interface RosterArtist {
  id: string;
  name: string;
  category: string;
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
