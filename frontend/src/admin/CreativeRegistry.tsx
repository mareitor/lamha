import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "./AdminAuthContext";
import * as adminApi from "../api/adminApi";
import { AdminLayout } from "./AdminLayout";
import { CREATIVE_FIELDS, CREATIVE_SERVICES } from "../data/creativeTaxonomy";
import type { CreativeRegistryEntry } from "../types";

// Account-wide real supplier/creative database (this is step 2 of the
// plan — schema + admin CRUD — before the real intake-form data gets
// imported and before the AI-matching feature is layered on top). Every
// field is visible here since this whole page is admin-only; the
// internal-vs-client-safe split (Mario, Sept 2026: email/phone/WhatsApp/
// price-range/technical requirements stay internal) only matters once a
// client-facing view exists — none does yet.

type FormState = {
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

export function CreativeRegistry() {
  const { password } = useAdminAuth();
  const [creatives, setCreatives] = useState<CreativeRegistryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

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
    setShowForm(true);
  }

  function startEdit(entry: CreativeRegistryEntry) {
    setEditingId(entry.id);
    setForm({
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
    setShowForm(true);
  }

  function toggleField(field: string) {
    setForm((f) => ({
      ...f,
      creativeFields: f.creativeFields.includes(field)
        ? f.creativeFields.filter((x) => x !== field)
        : [...f.creativeFields, field],
    }));
  }

  function toggleService(service: string) {
    setForm((f) => ({
      ...f,
      creativeServices: f.creativeServices.includes(service)
        ? f.creativeServices.filter((x) => x !== service)
        : [...f.creativeServices, service],
    }));
  }

  async function save() {
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
    } finally {
      setSaving(false);
    }
  }

  async function remove(itemId: string) {
    if (!password) return;
    const { creatives } = await adminApi.deleteCreative(password, itemId);
    setCreatives(creatives);
  }

  return (
    <AdminLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Creative Registry</h1>
        {!showForm && <button onClick={startAdd}>+ Add creative</button>}
      </div>
      <p style={{ fontSize: "0.85rem", opacity: 0.75, marginTop: -12, marginBottom: 24 }}>
        Your real supplier database — shared across every demo, not scoped to one. Contact info, price ranges,
        and technical requirements are admin-only and never shown to a client.
      </p>

      {error && <p style={{ color: "#B23A48" }}>{error}</p>}

      {showForm && (
        <div className="card" style={{ marginBottom: 24, maxWidth: 640 }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? "Edit creative" : "Add a creative"}</h3>

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
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {CREATIVE_FIELDS.map((field) => (
              <label
                key={field}
                className="pill"
                style={{
                  cursor: "pointer",
                  background: form.creativeFields.includes(field) ? "var(--color-accent)" : "var(--color-pill-bg)",
                  color: form.creativeFields.includes(field) ? "var(--color-on-dark)" : "inherit",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.creativeFields.includes(field)}
                  onChange={() => toggleField(field)}
                  style={{ marginRight: 6 }}
                />
                {field}
              </label>
            ))}
          </div>
          <label>Creative service (select at least one)</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CREATIVE_SERVICES.map((service) => (
              <label
                key={service}
                className="pill"
                style={{
                  cursor: "pointer",
                  background: form.creativeServices.includes(service) ? "var(--color-accent)" : "var(--color-pill-bg)",
                  color: form.creativeServices.includes(service) ? "var(--color-on-dark)" : "inherit",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.creativeServices.includes(service)}
                  onChange={() => toggleService(service)}
                  style={{ marginRight: 6 }}
                />
                {service}
              </label>
            ))}
          </div>

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
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {creatives === null && !error && <p>Loading…</p>}
      {creatives && creatives.length === 0 && !showForm && <p>No creatives yet — add the first one.</p>}

      {creatives && creatives.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {creatives.map((entry) => (
            <div key={entry.id} className="card" style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <strong>{entry.displayName}</strong>{" "}
                <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>({entry.contactName})</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {[...entry.creativeFields, ...entry.creativeServices].map((tag) => (
                    <span key={tag} className="pill">
                      {tag}
                    </span>
                  ))}
                  {entry.status === "inactive" && (
                    <span className="pill" style={{ opacity: 0.6 }}>
                      Inactive
                    </span>
                  )}
                </div>
                {entry.workDescription && (
                  <p style={{ margin: "8px 0 0", fontSize: "0.85rem", opacity: 0.78 }}>{entry.workDescription}</p>
                )}
                <p style={{ margin: "8px 0 0", fontSize: "0.8rem", opacity: 0.6 }}>
                  {entry.email} {entry.phone && `· ${entry.phoneCountryCode} ${entry.phone}`}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-secondary" onClick={() => startEdit(entry)}>
                  Edit
                </button>
                <button className="btn-secondary" onClick={() => remove(entry.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
