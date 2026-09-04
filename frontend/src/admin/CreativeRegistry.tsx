import { useEffect, useState, useCallback, useMemo } from "react";
import type { ChangeEvent } from "react";
import { useAdminAuth } from "./AdminAuthContext";
import * as adminApi from "../api/adminApi";
import { AdminLayout } from "./AdminLayout";
import {
  CREATIVE_FIELDS,
  CREATIVE_TAXONOMY,
  servicesForFields,
  fieldForService,
  fieldAccent,
} from "../data/creativeTaxonomy";
import type { CreativeRegistryEntry } from "../types";

// Account-wide real supplier/creative database (this is step 2 of the
// plan — schema + admin CRUD — before the real intake-form data gets
// imported and before the AI-matching feature is layered on top). Every
// field is visible here since this whole page is admin-only; the
// internal-vs-client-safe split (Mario, Sept 2026: email/phone/WhatsApp/
// price-range/technical requirements stay internal) only matters once a
// client-facing view exists — none does yet.

type FormState = {
  // "archived" is deliberately not selectable here — that state is only
  // reached via Remove/Restore in the list, never through this form.
  status: "active" | "inactive";
  displayName: string;
  contactName: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  creativeFields: string[];
  creativeServices: string[];
  workDescription: string;
  website: string;
  socialMediaLink: string;
  technicalRequirements: string;
  standardServicesPriceRange: string;
  whatsappForBusiness: boolean | null;
};

const EMPTY_FORM: FormState = {
  status: "active",
  displayName: "",
  contactName: "",
  email: "",
  phoneCountryCode: "",
  phone: "",
  creativeFields: [],
  creativeServices: [],
  workDescription: "",
  website: "",
  socialMediaLink: "",
  technicalRequirements: "",
  standardServicesPriceRange: "",
  whatsappForBusiness: null,
};

// Visually hidden but still focusable/clickable — keeps the underlying
// checkbox in the tab order and accessible to screen readers while the
// chip itself (colored dot/ring + tinted background) carries the visible
// on/off state. Not display:none, which would drop it from the a11y
// tree entirely.
const srOnlyCheckbox = {
  position: "absolute" as const,
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden" as const,
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap" as const,
  border: 0,
};

// A creative field chip: filled dot marker, one hue per field (see
// fieldAccent). Interactive (checkbox picker) when onToggle is passed;
// otherwise a read-only tag, e.g. on a registry card.
function FieldChip({
  field,
  selected,
  onToggle,
}: {
  field: string;
  selected: boolean;
  onToggle?: () => void;
}) {
  const a = fieldAccent(field);
  const dot = (
    <span style={{ width: 7, height: 7, borderRadius: "50%", background: a.dot, flexShrink: 0 }} />
  );
  if (!onToggle) {
    return (
      <span
        className="pill"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 10px",
          fontSize: "0.68rem",
          background: a.bgSelected,
          color: a.fg,
          border: `1px solid ${a.border}`,
        }}
      >
        {dot}
        {field}
      </span>
    );
  }
  return (
    <label
      className="pill"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        fontSize: "0.7rem",
        cursor: "pointer",
        background: selected ? a.bgSelected : "var(--color-pill-bg)",
        color: selected ? a.fg : "inherit",
        border: `1px solid ${selected ? a.border : "transparent"}`,
      }}
    >
      <input type="checkbox" checked={selected} onChange={onToggle} style={srOnlyCheckbox} />
      {dot}
      {field}
    </label>
  );
}

// Website/social-media icons — plain hand-drawn SVGs (no icon library in
// this project) rather than link text, per Mario's ask. currentColor so
// they pick up whatever color the wrapping <a> is given.
function IconGlobe() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconAtSign() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
  );
}

// Registry entries store website/social links as plain text ("basa.com"),
// not necessarily a full URL — add a protocol so the link actually
// navigates instead of being treated as relative to the current page.
function withProtocol(url: string): string {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// A creative service chip: hollow ring marker in its field's hue, so it
// reads as "the same category, one level down" next to a FieldChip.
function ServiceChip({
  service,
  field,
  selected,
  onToggle,
}: {
  service: string;
  field?: string;
  selected: boolean;
  onToggle?: () => void;
}) {
  const a = fieldAccent(field ?? service);
  const ring = (
    <span
      style={{ width: 7, height: 7, borderRadius: "50%", border: `1.5px solid ${a.ring}`, flexShrink: 0 }}
    />
  );
  if (!onToggle) {
    return (
      <span
        className="pill"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 10px",
          fontSize: "0.68rem",
          background: "var(--color-pill-bg)",
        }}
      >
        {ring}
        {service}
      </span>
    );
  }
  return (
    <label
      className="pill"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        fontSize: "0.68rem",
        cursor: "pointer",
        background: selected ? a.bgSelected : "var(--color-pill-bg)",
        color: selected ? a.fg : "inherit",
        border: `1px solid ${selected ? a.ring : "transparent"}`,
      }}
    >
      <input type="checkbox" checked={selected} onChange={onToggle} style={srOnlyCheckbox} />
      {ring}
      {service}
    </label>
  );
}

export function CreativeRegistry() {
  const { password } = useAdminAuth();
  const [creatives, setCreatives] = useState<CreativeRegistryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [duplicateMatch, setDuplicateMatch] = useState<CreativeRegistryEntry | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ added: number; skipped: string[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!password) return;
    try {
      const { creatives } = await adminApi.listCreatives(password);
      setCreatives(creatives);
    } catch {
      setError("Couldn't load the creative registry.");
    }
  }, [password]);

  useEffect(() => {
    load();
  }, [load]);

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDuplicateMatch(null);
    setShowForm(true);
  }

  function startEdit(entry: CreativeRegistryEntry) {
    setEditingId(entry.id);
    setForm({
      status: entry.status === "inactive" ? "inactive" : "active",
      displayName: entry.displayName,
      contactName: entry.contactName,
      email: entry.email,
      phoneCountryCode: entry.phoneCountryCode,
      phone: entry.phone,
      creativeFields: entry.creativeFields,
      creativeServices: entry.creativeServices,
      workDescription: entry.workDescription,
      website: entry.website,
      socialMediaLink: entry.socialMediaLink,
      technicalRequirements: entry.technicalRequirements,
      standardServicesPriceRange: entry.standardServicesPriceRange,
      whatsappForBusiness: entry.whatsappForBusiness,
    });
    setDuplicateMatch(null);
    setShowForm(true);
  }

  function toggleField(field: string) {
    setForm((f) => {
      const nowSelected = f.creativeFields.includes(field)
        ? f.creativeFields.filter((x) => x !== field)
        : [...f.creativeFields, field];
      // Match the real intake form: unchecking a field hides its services,
      // so drop any previously-picked service that no longer belongs to
      // any currently-selected field.
      const stillValidServices = new Set(nowSelected.flatMap((fld) => CREATIVE_TAXONOMY[fld] ?? []));
      return {
        ...f,
        creativeFields: nowSelected,
        creativeServices: f.creativeServices.filter((s) => stillValidServices.has(s)),
      };
    });
  }

  function toggleService(service: string) {
    setForm((f) => ({
      ...f,
      creativeServices: f.creativeServices.includes(service)
        ? f.creativeServices.filter((x) => x !== service)
        : [...f.creativeServices, service],
    }));
  }

  // Email is the natural dedupe key here — two different people are
  // vanishingly unlikely to share one, while the same person/studio
  // easily gets re-added by accident (or, once real intake-form imports
  // start, re-submits the form). Warn instead of silently blocking: a
  // real duplicate name with a different email (e.g. two different
  // "Studio X"s) is legitimate and shouldn't be prevented.
  function findDuplicateByEmail(email: string): CreativeRegistryEntry | null {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !creatives) return null;
    return (
      creatives.find(
        (e) => e.status !== "archived" && e.id !== editingId && e.email.trim().toLowerCase() === trimmed,
      ) ?? null
    );
  }

  async function performSave() {
    if (!password || !form.displayName.trim()) return;
    setSaving(true);
    try {
      const { creatives } = editingId
        ? await adminApi.updateCreative(password, editingId, form)
        : await adminApi.addCreative(password, form);
      setCreatives(creatives);
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      setDuplicateMatch(null);
    } finally {
      setSaving(false);
    }
  }

  function save() {
    const dup = findDuplicateByEmail(form.email);
    if (dup) {
      setDuplicateMatch(dup);
      return;
    }
    performSave();
  }

  // Soft delete — moves the entry to the trash. Nothing is ever erased
  // from KV through the app: restore() is the only way back, and there
  // is deliberately no "permanent delete" action anywhere in this UI
  // (Mario, Sept 2026: didn't want any in-app path that could actually
  // erase a record). The worker route still exists for a possible future
  // "empty trash" feature, but nothing here calls it.
  async function remove(itemId: string) {
    if (!password) return;
    const { creatives } = await adminApi.deleteCreative(password, itemId);
    setCreatives(creatives);
    setConfirmDeleteId(null);
  }

  async function restore(itemId: string) {
    if (!password) return;
    const { creatives } = await adminApi.restoreCreative(password, itemId);
    setCreatives(creatives);
  }

  function toggleTrash() {
    setShowTrash((v) => !v);
    setShowForm(false);
    setEditingId(null);
    setConfirmDeleteId(null);
  }

  // Bulk import — e.g. the 45-row batch exported from the real
  // supplier-intake form. Reads a JSON file (an array of
  // Partial<CreativeRegistryEntry> objects) chosen via the file input
  // below, hands it to the server-side import route (which defaults any
  // missing/malformed field to a blank rather than erroring, and skips
  // anything whose email already matches a live registry entry), then
  // refreshes the list and shows a one-line summary. Never throws on a
  // bad file — a parse failure or wrong shape just surfaces as a message,
  // same spirit as the server route: one bad input can't break the page.
  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file || !password) return;
    setImportError(null);
    setImportResult(null);
    setImporting(true);
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("That file isn't valid JSON.");
      }
      if (!Array.isArray(parsed)) {
        throw new Error("Expected a JSON array of creative entries.");
      }
      const { creatives, added, skipped } = await adminApi.importCreatives(password, parsed);
      setCreatives(creatives);
      setImportResult({ added, skipped });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  const archivedCount = creatives?.filter((e) => e.status === "archived").length ?? 0;

  const visibleCreatives = useMemo(() => {
    if (!creatives) return null;
    const base = creatives.filter((e) => (showTrash ? e.status === "archived" : e.status !== "archived"));
    const q = search.trim().toLowerCase();
    return base.filter((e) => {
      if (!showTrash && statusFilter !== "all" && e.status !== statusFilter) return false;
      if (fieldFilter && !e.creativeFields.includes(fieldFilter)) return false;
      if (!q) return true;
      const haystack = [e.displayName, e.contactName, e.email, ...e.creativeFields, ...e.creativeServices]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [creatives, showTrash, search, fieldFilter, statusFilter]);

  return (
    <AdminLayout>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h1 style={{ margin: 0 }}>{showTrash ? "Creative Registry — Trash" : "Creative Registry"}</h1>
        {!showTrash && !showForm && (
          <div style={{ display: "flex", gap: 10 }}>
            <label
              className="btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                margin: 0,
                textTransform: "none",
                letterSpacing: 0,
                fontWeight: 600,
                cursor: importing ? "not-allowed" : "pointer",
                opacity: importing ? 0.6 : 1,
              }}
            >
              {importing ? "Importing…" : "Import from file"}
              <input
                type="file"
                accept="application/json"
                onChange={handleImportFile}
                disabled={importing}
                style={srOnlyCheckbox}
              />
            </label>
            <button onClick={startAdd}>+ Add creative</button>
          </div>
        )}
      </div>
      <p style={{ fontSize: "0.85rem", opacity: 0.75, marginTop: -12, marginBottom: 24 }}>
        {showTrash
          ? "Removed creatives — nothing here is ever erased. Restore one back to the registry whenever you're ready."
          : "Your real supplier database — shared across every demo, not scoped to one. Contact info, price ranges, and technical requirements are admin-only and never shown to a client."}
      </p>

      {error && <p style={{ color: "#B23A48" }}>{error}</p>}
      {importError && <p style={{ color: "#B23A48" }}>{importError}</p>}
      {importResult && (
        <div
          className="card"
          style={{
            marginBottom: 24,
            padding: "12px 16px",
            background: "var(--paid-bg)",
            border: "1px solid var(--paid)",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.85rem" }}>
            Import complete — added <strong>{importResult.added}</strong>
            {importResult.skipped.length > 0 && (
              <>
                , skipped <strong>{importResult.skipped.length}</strong> duplicate
                {importResult.skipped.length === 1 ? "" : "s"} (already in the registry by email):{" "}
                {importResult.skipped.join(", ")}
              </>
            )}
            . New entries were imported as <strong>Inactive</strong> — review and flip each to Active from its
            edit form when you're ready.
          </p>
          <button
            className="btn-secondary"
            style={{ marginTop: 8, fontSize: "0.75rem", padding: "5px 10px" }}
            onClick={() => setImportResult(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: 24, maxWidth: 640 }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? "Edit creative" : "Add a creative"}</h3>

          <div style={{ marginBottom: 16 }}>
            <label>Registry status</label>
            <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
              {(["active", "inactive"] as const).map((opt) => (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}>
                  <input
                    type="radio"
                    name="status"
                    checked={form.status === opt}
                    onChange={() => setForm({ ...form, status: opt })}
                  />
                  {opt === "active" ? "Active" : "Inactive (hidden from matching)"}
                </label>
              ))}
            </div>
          </div>

          <h4 style={{ marginBottom: 8 }}>Contact information</h4>
          <label>Artist / studio / group / band name</label>
          <input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <div style={{ marginTop: 12 }}>
            <label>Real name</label>
            <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
            <div>
              <label>Email</label>
              <input
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  setDuplicateMatch(null);
                }}
              />
            </div>
            <div>
              <label>Phone</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  placeholder="+966"
                  style={{ width: 70 }}
                  value={form.phoneCountryCode}
                  onChange={(e) => setForm({ ...form, phoneCountryCode: e.target.value })}
                />
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
          </div>

          <h4 style={{ marginTop: 24, marginBottom: 8 }}>Creative profile</h4>
          <label>Creative field (select all that apply)</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {CREATIVE_FIELDS.map((field) => (
              <FieldChip
                key={field}
                field={field}
                selected={form.creativeFields.includes(field)}
                onToggle={() => toggleField(field)}
              />
            ))}
          </div>

          <label>Creative service (select at least one)</label>
          {form.creativeFields.length === 0 ? (
            <p style={{ fontSize: "0.8rem", opacity: 0.6, marginTop: 4 }}>
              Select a creative field above to see its services.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {servicesForFields(form.creativeFields).map(({ field, services }) => {
                const a = fieldAccent(field);
                const selectedCount = services.filter((s) => form.creativeServices.includes(s)).length;
                return (
                  <details
                    key={field}
                    style={{
                      border: `1px solid ${a.border}`,
                      borderRadius: 8,
                      padding: "6px 10px",
                      background: selectedCount > 0 ? a.bgSelected : "transparent",
                    }}
                  >
                    <summary style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.75rem", fontWeight: 600 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.dot, flexShrink: 0 }} />
                      <span style={{ textTransform: "uppercase", letterSpacing: "0.03em" }}>{field}</span>
                      <span style={{ opacity: 0.55, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                        {selectedCount > 0 ? `${selectedCount} selected` : `${services.length} services`}
                      </span>
                    </summary>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {services.map((service) => (
                        <ServiceChip
                          key={service}
                          service={service}
                          field={field}
                          selected={form.creativeServices.includes(service)}
                          onToggle={() => toggleService(service)}
                        />
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          )}

          <h4 style={{ marginTop: 24, marginBottom: 8 }}>Work details</h4>
          <label>Tell us more about your work</label>
          <textarea
            rows={3}
            value={form.workDescription}
            onChange={(e) => setForm({ ...form, workDescription: e.target.value })}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
            <div>
              <label>Website</label>
              <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div>
              <label>Social media link</label>
              <input
                value={form.socialMediaLink}
                onChange={(e) => setForm({ ...form, socialMediaLink: e.target.value })}
              />
            </div>
          </div>

          <h4 style={{ marginTop: 24, marginBottom: 8 }}>
            Service & requirements <span style={{ fontWeight: 400, opacity: 0.6 }}>(internal only)</span>
          </h4>
          <label>Technical requirements</label>
          <textarea
            rows={2}
            value={form.technicalRequirements}
            onChange={(e) => setForm({ ...form, technicalRequirements: e.target.value })}
          />
          <div style={{ marginTop: 12 }}>
            <label>Standard services and estimated price range</label>
            <textarea
              rows={2}
              value={form.standardServicesPriceRange}
              onChange={(e) => setForm({ ...form, standardServicesPriceRange: e.target.value })}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <label>Uses WhatsApp for business inquiries?</label>
            <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
              {(["yes", "no", "unspecified"] as const).map((opt) => (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}>
                  <input
                    type="radio"
                    name="whatsapp"
                    checked={
                      opt === "unspecified"
                        ? form.whatsappForBusiness === null
                        : form.whatsappForBusiness === (opt === "yes")
                    }
                    onChange={() =>
                      setForm({
                        ...form,
                        whatsappForBusiness: opt === "unspecified" ? null : opt === "yes",
                      })
                    }
                  />
                  {opt === "unspecified" ? "Not specified" : opt === "yes" ? "Yes" : "No"}
                </label>
              ))}
            </div>
          </div>

          {duplicateMatch && (
            <div
              style={{
                marginTop: 20,
                padding: 12,
                borderRadius: 8,
                background: "var(--overdue-bg)",
                border: "1px solid var(--overdue)",
              }}
            >
              <p style={{ margin: 0, fontSize: "0.85rem" }}>
                A creative with this email is already in the registry: <strong>{duplicateMatch.displayName}</strong>.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    const existing = duplicateMatch;
                    setDuplicateMatch(null);
                    startEdit(existing);
                  }}
                >
                  Edit that one instead
                </button>
                <button className="btn-secondary" onClick={performSave}>
                  Add anyway — it's a different person
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button onClick={save} disabled={saving || !form.displayName.trim()}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Add creative"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setShowForm(false);
                setForm(EMPTY_FORM);
                setEditingId(null);
                setDuplicateMatch(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showForm && creatives && creatives.length > 0 && (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
          <input
            placeholder="Search by name, contact, field, or service…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 320 }}
          />
          <select value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">All fields</option>
            {CREATIVE_FIELDS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          {!showTrash && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              style={{ maxWidth: 180 }}
            >
              <option value="all">Active + inactive</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          )}
          {archivedCount > 0 && (
            <button
              className="btn-secondary"
              onClick={toggleTrash}
              style={{ marginLeft: "auto", fontSize: "0.8rem", padding: "8px 14px" }}
            >
              {showTrash ? "← Back to registry" : `Trash (${archivedCount})`}
            </button>
          )}
        </div>
      )}

      {!showForm && visibleCreatives === null && !error && <p>Loading…</p>}
      {!showForm && visibleCreatives && visibleCreatives.length === 0 && (
        <p>
          {showTrash
            ? "Trash is empty."
            : creatives && creatives.length > 0
              ? "No creatives match your search."
              : "No creatives yet — add the first one."}
        </p>
      )}

      {!showForm && visibleCreatives && visibleCreatives.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {visibleCreatives.map((entry) => {
            const waDigits =
              entry.whatsappForBusiness && entry.phone
                ? `${entry.phoneCountryCode}${entry.phone}`.replace(/\D/g, "")
                : null;
            const confirming = confirmDeleteId === entry.id;
            return (
              <div key={entry.id} className="card" style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <strong>{entry.displayName}</strong>
                    <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>({entry.contactName})</span>
                    {entry.status === "inactive" && (
                      <span className="pill" style={{ opacity: 0.6, fontSize: "0.65rem", padding: "2px 8px" }}>
                        Inactive
                      </span>
                    )}
                    {entry.status === "archived" && entry.archivedAt && (
                      <span className="pill" style={{ opacity: 0.6, fontSize: "0.65rem", padding: "2px 8px" }}>
                        Removed {new Date(entry.archivedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {entry.creativeFields.length > 0 && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
                      {entry.creativeFields.map((f) => (
                        <FieldChip key={f} field={f} selected />
                      ))}
                    </div>
                  )}
                  {entry.creativeServices.length > 0 && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
                      {entry.creativeServices.map((s) => (
                        <ServiceChip key={s} service={s} field={fieldForService(s)} selected={false} />
                      ))}
                    </div>
                  )}

                  {entry.workDescription && (
                    <p style={{ margin: "8px 0 0", fontSize: "0.85rem", opacity: 0.78 }}>{entry.workDescription}</p>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: 14,
                      marginTop: 8,
                      fontSize: "0.8rem",
                      opacity: 0.85,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {entry.email && (
                      <a href={`mailto:${entry.email}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        ✉ {entry.email}
                      </a>
                    )}
                    {entry.phone && (
                      <span style={{ opacity: 0.75 }}>
                        {entry.phoneCountryCode} {entry.phone}
                      </span>
                    )}
                    {waDigits && (
                      <a
                        href={`https://wa.me/${waDigits}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--paid)", fontWeight: 600 }}
                      >
                        ✆ WhatsApp
                      </a>
                    )}
                    {entry.website && (
                      <a
                        href={withProtocol(entry.website)}
                        target="_blank"
                        rel="noreferrer"
                        title="Website"
                        aria-label="Website"
                        style={{ display: "inline-flex", alignItems: "center", opacity: 0.75 }}
                      >
                        <IconGlobe />
                      </a>
                    )}
                    {entry.socialMediaLink && (
                      <a
                        href={withProtocol(entry.socialMediaLink)}
                        target="_blank"
                        rel="noreferrer"
                        title="Social media"
                        aria-label="Social media"
                        style={{ display: "inline-flex", alignItems: "center", opacity: 0.75 }}
                      >
                        <IconAtSign />
                      </a>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                  {showTrash ? (
                    <button className="btn-secondary" onClick={() => restore(entry.id)}>
                      Restore
                    </button>
                  ) : confirming ? (
                    <>
                      <span style={{ fontSize: "0.75rem", opacity: 0.75 }}>Remove?</span>
                      <button onClick={() => remove(entry.id)} style={{ background: "var(--overdue)" }}>
                        Confirm
                      </button>
                      <button className="btn-secondary" onClick={() => setConfirmDeleteId(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn-secondary" onClick={() => startEdit(entry)}>
                        Edit
                      </button>
                      <button className="btn-secondary" onClick={() => setConfirmDeleteId(entry.id)}>
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
