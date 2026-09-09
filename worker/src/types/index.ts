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

  // ---- Schema v2 additions (Sept 2026) — see the block above. Optional
  // so every pre-existing KV record (and any code that hasn't been
  // touched yet) still type-checks; `services` absent or empty means
  // this entry hasn't been migrated yet (see migrateCreativeToServices).
  services?: CreativeService[];
  curatorNote?: CuratorNote | null;
  verifiedFacts?: VerifiedFact[];

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

// ---- Registry schema v2 (Sept 2026) — per-service hard facts, per the
// "Selecctive — AI, Data & Matching" design doc Mario shared. Lamha's
// Creative Registry is being treated as an early prototype of
// Selecctive's own eventual schema, so this follows that doc closely:
// - Creative Services become first-class records, each with their own
//   hard facts, instead of one shared blob per creative.
// - Every hard fact carries a trust tier (Fact<T>) so "unknown" and
//   "confirmed no" are distinguishable — the doc is explicit that
//   missing information must never be treated as a hard no.
// - Curator notes (free text, judgment) and verified facts (structured,
//   team-confirmed claims) are two different things — see the schema
//   proposal doc (claude/lamha-creative-schema-proposal.md) for the
//   full reasoning.
//
// This is deliberately ADDITIVE to CreativeRegistryEntry below: the
// legacy flat fields (creativeFields, creativeServices, workDescription,
// standardServicesPriceRange, technicalRequirements) are untouched and
// still populated for every existing entry. Nothing reads/writes those
// as the source of truth going forward — `services` is — but keeping
// them in place means the migration to this shape (see
// migrateCreativeToServices in lib/kv.ts) can never lose data, and is
// safe to re-run.

export type FactSource = "self_reported" | "ai_inferred" | "team_verified";

// value: null means UNKNOWN, never treated as "no" — the whole point of
// this wrapper. confidence is only meaningful when source is
// "ai_inferred".
export interface Fact<T> {
  value: T | null;
  source: FactSource | null;
  confidence?: number;
  updatedAt: number;
}

export type TravelWillingness = "local" | "regional" | "worldwide";

// The hard facts common to every Creative Service, regardless of
// field — these are what the (not-yet-built) feasibility filter will
// check a brief's hard requirements against. Field-specific extras
// (a DJ's "brings own equipment," an installation artist's
// "fabrication in-house vs partners") are deliberately out of scope for
// this round — see the schema proposal doc, open question #2.
export interface ServiceHardFacts {
  minimumBudget: Fact<{ amount: number; currency: string }>;
  travelWillingness: Fact<TravelWillingness>;
  outdoorCapable: Fact<boolean>;
  leadTimeDays: Fact<number>;
}

// AI's own interpretation of what a service is about — not asserted as
// fact, allowed to be uncertain, and always traceable to what it was
// derived from. Regenerated as evidence changes rather than set once.
export interface SemanticTag {
  tag: string;
  confidence: number; // 0-100 — confidence in the INTERPRETATION, not a match score
  sourceEvidence: string[];
  updatedAt: number;
}

// Free-text judgment from Mario's team — "great with VIP clients,"
// "installations stronger than tabletop work" — fed into matching as
// explicitly trusted internal commentary, distinct from and weighted
// above the AI's own inferred tags. Can live at profile level and/or
// per service.
export interface CuratorNote {
  text: string;
  authorName: string;
  updatedAt: number;
}

// A structured claim the team has actually verified, as opposed to
// something self-reported or AI-guessed — starting with past clients
// (Mario, Sept 2026: "verify if the creative has really worked with
// company X Y Z"). `kind` is deliberately open-ended so more claim
// types can be added later without a redesign.
export interface VerifiedFact {
  id: string;
  kind: "past_client" | "other";
  label: string;
  verifiedBy: string;
  verifiedAt: number;
  note?: string;
}

// One service a creative offers — the new central matching unit
// (per the source doc: "the Creative Service is the central unit").
// A match result now points at a specific CreativeService, not just a
// creative profile.
export interface CreativeService {
  id: string;
  creativeField: string; // exactly one field per service
  serviceName: string;
  status: "active" | "inactive";

  hardFacts: ServiceHardFacts;
  workDescription: string; // free text — evidence for the AI layer, not itself a hard fact

  // Sept 2026 — the creative's own free-text explanation when a flat
  // minimum-budget number was hard to give (self-intake flow). The
  // Worker's AI-parse route turns this into a best-guess
  // hardFacts.minimumBudget, tagged "ai_inferred" (never "self_reported")
  // specifically so a bad parse can only ever downweight a match, never
  // hard-exclude one — see the feasibility-filter trust-tier rule above.
  // Kept alongside the parsed number either way so a human can sanity-
  // check it. Empty string means no free-text answer was given.
  budgetNote: string;

  // Sept 9, round 2 — Mario's feedback: the migrated-over `workDescription`
  // was showing up identical on every service (same legacy bio, copied
  // N times), and having the intake flow let a creative "edit" it just
  // meant overwriting that shared text once per service. Instead:
  // `workDescription` stays as-is, untouched by the intake flow (admin-
  // editable only, via CreativeServicesPanel); this is a NEW, separate,
  // always-starts-empty field the intake flow writes to — "what's
  // specific about you for this particular service" — additive rather
  // than a rewrite of what they already told us.
  serviceHighlight: string;

  aiSemanticTags: SemanticTag[];
  curatorNote: CuratorNote | null;
  verifiedFacts: VerifiedFact[];

  addedAt: number;
  updatedAt: number;
}

// A never-populated ServiceHardFacts, for constructing a new service
// with every hard fact starting at "unknown" rather than a guessed
// default — used both by the add-service route and the legacy migration.
export function emptyServiceHardFacts(now: number): ServiceHardFacts {
  const blank = <T,>(): Fact<T> => ({ value: null, source: null, updatedAt: now });
  return {
    minimumBudget: blank(),
    travelWillingness: blank(),
    outdoorCapable: blank(),
    leadTimeDays: blank(),
  };
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
// Points at one specific CreativeService, not a whole creative profile
// — matches the schema v2 model where the service is the central
// matching unit (see the block above and the schema proposal doc).
export interface CreativeMatch {
  creativeId: string;
  serviceId: string;
  displayName: string;
  creativeField: string;
  serviceName: string;
  workDescription: string;
  curatorNote: string | null;
  email: string;
  phoneCountryCode: string;
  phone: string;
  whatsappForBusiness: boolean | null;
  website: string;
  socialMediaLink: string;
  fitScore: number;
  reason: string;
}
