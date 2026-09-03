import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../AdminAuthContext";
import * as adminApi from "../../api/adminApi";
import { resolveApiUrl } from "../../api/client";
import type { DemoRecord } from "../../types";
import { AdminLayout } from "../AdminLayout";
import { ProgrammingTab } from "./ProgrammingTab";
import { InvoicesTab } from "./InvoicesTab";

type Tab = "branding" | "event" | "payment" | "programming" | "invoices" | "mode" | "danger";

const TABS: { key: Tab; label: string }[] = [
  { key: "branding", label: "Branding" },
  { key: "event", label: "Event" },
  { key: "payment", label: "Payment policy" },
  { key: "programming", label: "Programming" },
  { key: "invoices", label: "Invoices" },
  { key: "mode", label: "Mode" },
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
      setError("Couldn't load this demo.");
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
      {tab === "invoices" && <InvoicesTab demo={demo} password={password!} onSaved={setDemo} />}
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

  async function save() {
    setSaving(true);
    try {
      const updated = await adminApi.updateBranding(password, demo.id, {
        companyDisplayName,
        accentColor,
        logo,
      });
      onSaved(updated);
      setLogo(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <label>Display name</label>
      <input value={companyDisplayName} onChange={(e) => setCompanyDisplayName(e.target.value)} />

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
    </div>
  );
}

function EventTab({ demo, password, onSaved }: TabProps) {
  const [form, setForm] = useState(demo.event);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      onSaved(await adminApi.updateEvent(password, demo.id, form));
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
    </div>
  );
}

function PaymentTab({ demo, password, onSaved }: TabProps) {
  const [form, setForm] = useState(demo.paymentPolicy);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      onSaved(await adminApi.updatePaymentPolicy(password, demo.id, form));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
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
    </div>
  );
}

function ModeTab({ demo, password, onSaved }: TabProps) {
  const [saving, setSaving] = useState(false);

  async function setMode(mode: DemoRecord["mode"]) {
    setSaving(true);
    try {
      onSaved(await adminApi.setMode(password, demo.id, mode));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
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
      <h3>Extend</h3>
      <p style={{ fontSize: "0.85rem" }}>
        Expires {new Date(demo.expiresAt).toLocaleString()}. Extending adds 14 days from right now.
      </p>
      <button onClick={extend} disabled={extending}>
        {extending ? "Extending…" : "Extend 14 days"}
      </button>

      <h3 style={{ marginTop: 32 }}>Delete demo</h3>
      <p style={{ fontSize: "0.85rem" }}>
        Permanently deletes this demo, its logo, and its data. This cannot be undone.
      </p>
      {!confirmDelete ? (
        <button className="btn-secondary" onClick={() => setConfirmDelete(true)}>
          Delete this demo
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
