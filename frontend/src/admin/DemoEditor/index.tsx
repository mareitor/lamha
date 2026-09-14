import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../AdminAuthContext";
import * as adminApi from "../../api/adminApi";
import { resolveApiUrl } from "../../api/client";
import type { DemoRecord } from "../../types";
import { AdminLayout } from "../AdminLayout";
import { ProgrammingTab } from "./ProgrammingTab";
import { InvoicesTab } from "./InvoicesTab";
import { LocationsTab } from "./LocationsTab";
import { MatchesTab } from "./MatchesTab";

type Tab = "branding" | "event" | "payment" | "programming" | "locations" | "invoices" | "matches" | "mode" | "danger";

const TABS: { key: Tab; label: string }[] = [
  { key: "branding", label: "Branding" },
  { key: "event", label: "Event" },
  { key: "payment", label: "Budget & payment" },
  { key: "programming", label: "Programming" },
  { key: "locations", label: "Locations" },
  { key: "invoices", label: "Invoices" },
  { key: "matches", label: "AI Matches" },
  { key: "mode", label: "Mode & kind" },
  { key: "danger", label: "Danger zone" },
];

export function DemoEditor() {
  const { id } = useParams<{ id: string }>();
  const { password } = useAdminAuth();
  const [demo, setDemo] = useState<DemoRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("branding");

  const load = useCallback(async () => {
    if (!password || !id) return;
    try {
      const d = await adminApi.getDemo(password, id);
      setDemo(d);
    } catch {
      setError("Couldn't load this project.");
    }
  }, [password, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!id) return null;
  if (error) return <AdminLayout><p style={{ color: "#B23A48" }}>{error}</p></AdminLayout>;
  if (!demo) return <AdminLayout><p>Loading…</p></AdminLayout>;

  return (
    <AdminLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ margin: 0 }}>{demo.companyName}</h1>
        <a href={`/${demo.id}`} target="_blank" rel="noreferrer" style={{ fontSize: "0.85rem" }}>
          Open client link ↗
        </a>
      </div>

      <nav style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--color-pill-bg)", margin: "24px 0" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={tab === t.key ? "" : "btn-secondary"}
            style={{ borderRadius: "3px 3px 0 0", border: "none", fontSize: "0.85rem" }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "branding" && <BrandingTab demo={demo} password={password!} onSaved={setDemo} />}
      {tab === "event" && <EventTab demo={demo} password={password!} onSaved={setDemo} />}
      {tab === "payment" && <PaymentTab demo={demo} password={password!} onSaved={setDemo} />}
      {tab === "programming" && <ProgrammingTab demo={demo} password={password!} onSaved={setDemo} />}
      {tab === "locations" && <LocationsTab demo={demo} password={password!} onSaved={setDemo} />}
      {tab === "invoices" && <InvoicesTab demo={demo} password={password!} onSaved={setDemo} />}
      {tab === "matches" && <MatchesTab demo={demo} password={password!} />}
      {tab === "mode" && <ModeTab demo={demo} password={password!} onSaved={setDemo} />}
      {tab === "danger" && <DangerZoneTab demo={demo} password={password!} />}
    </AdminLayout>
  );
}

interface TabProps {
  demo: DemoRecord;
  password: string;
  onSaved: (demo: DemoRecord) => void;
}

function BrandingTab({ demo, password, onSaved }: TabProps) {
  const [companyDisplayName, setCompanyDisplayName] = useState(demo.branding.companyDisplayName);
  const [accentColor, setAccentColor] = useState(demo.branding.accentColor ?? "#2C4741");
  const [logo, setLogo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Internal name (demo.companyName) -- separate field from Display name
  // above (branding.companyDisplayName, which the client actually sees).
  // This one is admin-only: the dashboard list and this page's own header.
  // Own state/save so a typo fix here can't clobber the branding save.
  const [companyName, setCompanyNameField] = useState(demo.companyName);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameJustSaved, setNameJustSaved] = useState(false);

  async function saveName() {
    setNameSaving(true);
    setNameJustSaved(false);
    try {
      onSaved(await adminApi.renameCompany(password, demo.id, companyName));
      setNameJustSaved(true);
      setTimeout(() => setNameJustSaved(false), 2500);
    } finally {
      setNameSaving(false);
    }
  }

  async function save() {
    setSaving(true);
    setJustSaved(false);
    try {
      const updated = await adminApi.updateBranding(password, demo.id, {
        companyDisplayName,
        accentColor,
        logo,
      });
      onSaved(updated);
      setLogo(null);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <label>Internal name</label>
      <p style={{ fontSize: "0.8rem", opacity: 0.65, marginTop: -4, marginBottom: 8 }}>
        Admin list and this page's header only — the client never sees this.
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <input value={companyName} onChange={(e) => setCompanyNameField(e.target.value)} style={{ flex: 1 }} />
        <button onClick={saveName} disabled={nameSaving} className="btn-secondary" style={{ whiteSpace: "nowrap" }}>
          {nameSaving ? "Saving…" : "Save"}
        </button>
      </div>
      {nameJustSaved && <SavedBadge />}

      <div style={{ marginTop: 24 }}>
        <label>Display name</label>
        <input value={companyDisplayName} onChange={(e) => setCompanyDisplayName(e.target.value)} />
      </div>

      <div style={{ marginTop: 16 }}>
        <label>Accent color</label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            style={{ width: 44, padding: 2 }}
          />
          <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label>Replace logo</label>
        {demo.branding.logoUrl && (
          <img
            src={resolveApiUrl(demo.branding.logoUrl) ?? undefined}
            alt="Current logo"
            style={{ maxWidth: 120, maxHeight: 60, display: "block", marginBottom: 8, background: "#fff", padding: 6 }}
          />
        )}
        <input
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
        />
      </div>

      <button onClick={save} disabled={saving} style={{ marginTop: 20 }}>
        {saving ? "Saving…" : "Save branding"}
      </button>
      {justSaved && <SavedBadge />}
    </div>
  );
}

function EventTab({ demo, password, onSaved }: TabProps) {
  const [form, setForm] = useState(demo.event);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  async function save() {
    setSaving(true);
    setJustSaved(false);
    try {
      onSaved(await adminApi.updateEvent(password, demo.id, form));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <label>Event name</label>
      <input value={form.eventName} onChange={(e) => setForm({ ...form, eventName: e.target.value })} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div>
          <label>Start date</label>
          <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </div>
        <div>
          <label>End date</label>
          <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label>Location</label>
        <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      </div>

      <div style={{ marginTop: 16 }}>
        <label>Expected attendees</label>
        <input
          type="number"
          value={form.expectedAttendees ?? ""}
          onChange={(e) => setForm({ ...form, expectedAttendees: e.target.value ? Number(e.target.value) : null })}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <label>Description</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <button onClick={save} disabled={saving} style={{ marginTop: 20 }}>
        {saving ? "Saving…" : "Save event"}
      </button>
      {justSaved && <SavedBadge />}
    </div>
  );
}

function PaymentTab({ demo, password, onSaved }: TabProps) {
  const [form, setForm] = useState(demo.paymentPolicy);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Total budget lives on demo.budget, not demo.paymentPolicy — separate
  // state/save so one doesn't clobber the other. Admin previously had no
  // way to set this at all (the client route is self-service-only by
  // design); needed once "live" migrated projects have a real budget to
  // seed. See adminApi.updateBudget / worker PATCH /demos/:id/budget.
  const [budget, setBudgetForm] = useState(demo.budget);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetJustSaved, setBudgetJustSaved] = useState(false);

  async function save() {
    setSaving(true);
    setJustSaved(false);
    try {
      onSaved(await adminApi.updatePaymentPolicy(password, demo.id, form));
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function saveBudget() {
    setBudgetSaving(true);
    setBudgetJustSaved(false);
    try {
      onSaved(await adminApi.updateBudget(password, demo.id, budget));
      setBudgetJustSaved(true);
      setTimeout(() => setBudgetJustSaved(false), 2500);
    } finally {
      setBudgetSaving(false);
    }
  }

  return (
    <>
      <div className="card" style={{ maxWidth: 480 }}>
        <h3 style={{ marginTop: 0 }}>Total budget</h3>
        <p style={{ fontSize: "0.8rem", opacity: 0.65, marginTop: -8 }}>
          Admin-only — this whole card, and the internal costs below, are never shown to the client.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label>Total budget</label>
            <input
              type="number"
              value={budget.totalBudget ?? ""}
              onChange={(e) =>
                setBudgetForm({ ...budget, totalBudget: e.target.value ? Number(e.target.value) : null })
              }
            />
          </div>
          <div>
            <label>Currency</label>
            <input value={budget.currency} onChange={(e) => setBudgetForm({ ...budget, currency: e.target.value })} />
          </div>
        </div>
        <button onClick={saveBudget} disabled={budgetSaving} style={{ marginTop: 20 }}>
          {budgetSaving ? "Saving…" : "Save budget"}
        </button>
        {budgetJustSaved && <SavedBadge />}
      </div>

      <BudgetSpendCard demo={demo} password={password} onSaved={onSaved} />

      <div className="card" style={{ maxWidth: 480, marginTop: 20 }}>
        <h3 style={{ marginTop: 0 }}>Payment policy</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label>Currency</label>
            <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
          <div>
            <label>Payment terms (days)</label>
            <input
              type="number"
              value={form.paymentTermsDays}
              onChange={(e) => setForm({ ...form, paymentTermsDays: Number(e.target.value) })}
            />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <label>Deposit %</label>
          <input
            type="number"
            value={form.depositPercent}
            onChange={(e) => setForm({ ...form, depositPercent: Number(e.target.value) })}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <label>Invoicing contact name</label>
          <input
            value={form.invoicingContactName}
            onChange={(e) => setForm({ ...form, invoicingContactName: e.target.value })}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <label>Invoicing contact email</label>
          <input
            value={form.invoicingContactEmail}
            onChange={(e) => setForm({ ...form, invoicingContactEmail: e.target.value })}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <label>Billing address</label>
          <textarea rows={2} value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} />
        </div>
        <button onClick={save} disabled={saving} style={{ marginTop: 20 }}>
          {saving ? "Saving…" : "Save payment policy"}
        </button>
        {justSaved && <SavedBadge />}
      </div>
    </>
  );
}

// Admin-only cost tracking (Sept 2026, Mario): Confirmed/Pending Spend
// are computed live from demo.programming (summed by status — never
// stored, so they can't drift out of sync with the actual season), Ops &
// Team Costs is an editable list of internal staffing/ops line items,
// and Remaining Budget nets total budget against all three. Mirrors what
// the old per-project tool already tracked for at least one real client.
// Never shown to the client — sanitizeDemo strips `budget` entirely
// before a client-scoped route ever returns a demo record.
function BudgetSpendCard({ demo, password, onSaved }: TabProps) {
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const confirmedSpend = demo.programming
    .filter((p) => p.status === "confirmed")
    .reduce((sum, p) => sum + p.priceQuoted, 0);
  const pendingSpend = demo.programming
    .filter((p) => p.status === "proposed")
    .reduce((sum, p) => sum + p.priceQuoted, 0);
  const opsTotal = demo.budget.opsAndTeamCosts.reduce((sum, item) => sum + item.amount, 0);
  const remaining = (demo.budget.totalBudget ?? 0) - confirmedSpend - pendingSpend - opsTotal;
  const currency = demo.budget.currency;

  async function addItem() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      onSaved(await adminApi.addOpsCostItem(password, demo.id, { name: newName.trim(), amount: Number(newAmount) || 0 }));
      setNewName("");
      setNewAmount("");
    } finally {
      setAdding(false);
    }
  }

  async function updateAmount(itemId: string, amount: number) {
    setBusyId(itemId);
    try {
      onSaved(await adminApi.updateOpsCostItem(password, demo.id, itemId, { amount }));
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(itemId: string) {
    setBusyId(itemId);
    try {
      onSaved(await adminApi.deleteOpsCostItem(password, demo.id, itemId));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480, marginTop: 20 }}>
      <h3 style={{ marginTop: 0 }}>Spend</h3>

      <SpendRow label="Confirmed spend" value={confirmedSpend} currency={currency} />
      <SpendRow label="Pending spend" value={pendingSpend} currency={currency} />
      <SpendRow label="Ops & team costs" value={opsTotal} currency={currency} />

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--color-pill-bg)" }}>
        <strong style={{ fontSize: "0.85rem" }}>Line items</strong>
        {demo.budget.opsAndTeamCosts.length === 0 && (
          <p style={{ fontSize: "0.82rem", opacity: 0.6, margin: "6px 0" }}>No line items yet.</p>
        )}
        {demo.budget.opsAndTeamCosts.map((item) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <span style={{ flex: 1, fontSize: "0.85rem" }}>{item.name}</span>
            <input
              type="number"
              defaultValue={item.amount}
              disabled={busyId === item.id}
              onBlur={(e) => {
                const next = Number(e.target.value) || 0;
                if (next !== item.amount) updateAmount(item.id, next);
              }}
              style={{ width: 110 }}
            />
            <button
              className="btn-secondary"
              disabled={busyId === item.id}
              onClick={() => removeItem(item.id)}
              style={{ padding: "4px 10px" }}
            >
              ×
            </button>
          </div>
        ))}

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <input
            placeholder="e.g. Program Manager, Transportation…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ flex: 1 }}
          />
          <input
            type="number"
            placeholder="Amount"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            style={{ width: 110 }}
          />
          <button onClick={addItem} disabled={adding || !newName.trim()} style={{ whiteSpace: "nowrap" }}>
            + Add
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--color-pill-bg)" }}>
        <SpendRow label="Remaining budget" value={remaining} currency={currency} strong />
      </div>
    </div>
  );
}

function SpendRow({
  label,
  value,
  currency,
  strong,
}: {
  label: string;
  value: number;
  currency: string;
  strong?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: strong ? "1rem" : "0.85rem" }}>
      <span style={{ opacity: strong ? 1 : 0.75, fontWeight: strong ? 600 : 400 }}>{label}</span>
      <span style={{ fontWeight: strong ? 700 : 500, fontVariantNumeric: "tabular-nums" }}>
        {value.toLocaleString()} {currency}
      </span>
    </div>
  );
}

// Shown next to a save button for a couple seconds after a successful
// save — otherwise the button just silently reverts to its idle label
// and there's no way to tell the save actually landed.
function SavedBadge() {
  return (
    <span
      style={{
        marginLeft: 12,
        fontSize: "0.85rem",
        fontWeight: 600,
        color: "var(--color-primary)",
      }}
    >
      ✓ Saved
    </span>
  );
}

function ModeTab({ demo, password, onSaved }: TabProps) {
  const [saving, setSaving] = useState(false);
  const [kindSaving, setKindSaving] = useState(false);

  async function setMode(mode: DemoRecord["mode"]) {
    setSaving(true);
    try {
      onSaved(await adminApi.setMode(password, demo.id, mode));
    } finally {
      setSaving(false);
    }
  }

  // Convert between the 14-day prospect-pitch flow and a real, ongoing
  // client engagement (Sept 2026 — see DemoKind in types/index.ts). This
  // is separate from "mode" (managed vs self-service) above — kind
  // controls expiry/demo-language, mode controls who can edit programming.
  async function setKind(kind: DemoRecord["kind"]) {
    setKindSaving(true);
    try {
      onSaved(await adminApi.updateKind(password, demo.id, kind));
    } finally {
      setKindSaving(false);
    }
  }

  return (
    <>
      <div className="card" style={{ maxWidth: 480 }}>
        <p>
          Currently: <strong>{demo.kind === "live" ? "Live client project" : "Demo"}</strong>
        </p>
        <p style={{ fontSize: "0.85rem", opacity: 0.75 }}>
          {demo.kind === "live"
            ? "This is a real, ongoing client engagement — no countdown, no expiry, no demo language anywhere in the client view."
            : "This is a 14-day prospect-pitch demo — it shows a countdown and expires automatically."}
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button disabled={kindSaving || demo.kind === "demo"} onClick={() => setKind("demo")}>
            Set to demo
          </button>
          <button disabled={kindSaving || demo.kind === "live"} onClick={() => setKind("live")}>
            Set to live client project
          </button>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 480, marginTop: 20 }}>
        <p>
          Current mode: <strong>{demo.mode === "self-service" ? "Self-service" : "Fully managed"}</strong>{" "}
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            (last set by {demo.modeSetBy})
          </span>
        </p>
        <p style={{ fontSize: "0.85rem", opacity: 0.75 }}>
          The client can also change this themselves from inside their demo at any time — this is an override,
          not the only place it's set.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button disabled={saving || demo.mode === "managed"} onClick={() => setMode("managed")}>
            Set to managed
          </button>
          <button disabled={saving || demo.mode === "self-service"} onClick={() => setMode("self-service")}>
            Set to self-service
          </button>
        </div>
      </div>
    </>
  );
}

function DangerZoneTab({ demo, password }: { demo: DemoRecord; password: string }) {
  const navigate = useNavigate();
  const [extending, setExtending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function extend() {
    setExtending(true);
    try {
      await adminApi.extendDemo(password, demo.id, 14);
      window.location.reload();
    } finally {
      setExtending(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await adminApi.deleteDemo(password, demo.id);
      navigate("/admin");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      {demo.kind === "live" ? (
        <>
          <h3>Extend</h3>
          <p style={{ fontSize: "0.85rem" }}>
            This is a live client project — it doesn't expire, so there's nothing to extend. Use the Mode tab
            to switch it back to a demo if it ever needs a 14-day countdown again.
          </p>
        </>
      ) : (
        <>
          <h3>Extend</h3>
          <p style={{ fontSize: "0.85rem" }}>
            Expires {new Date(demo.expiresAt).toLocaleString()}. Extending adds 14 days from right now.
          </p>
          <button onClick={extend} disabled={extending}>
            {extending ? "Extending…" : "Extend 14 days"}
          </button>
        </>
      )}

      <h3 style={{ marginTop: 32 }}>Delete project</h3>
      <p style={{ fontSize: "0.85rem" }}>
        Permanently deletes this project, its logo, and its data. This cannot be undone.
      </p>
      {!confirmDelete ? (
        <button className="btn-secondary" onClick={() => setConfirmDelete(true)}>
          Delete this project
        </button>
      ) : (
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem" }}>Are you sure? This is permanent.</span>
          <button style={{ background: "#B23A48" }} onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Yes, delete"}
          </button>
          <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
