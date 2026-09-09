import { useState } from "react";
import * as adminApi from "../api/adminApi";
import { CREATIVE_FIELDS, CREATIVE_TAXONOMY, fieldAccent } from "../data/creativeTaxonomy";
import type { CreativeRegistryEntry, CreativeService, TravelWillingness, VerifiedFact } from "../types";

// Schema v2 (Sept 2026) — the per-service panel shown inside an expanded
// Creative Registry card. Each service a creative offers is its own
// record with its own hard facts (see worker's types/index.ts and the
// schema proposal doc). This is deliberately a separate file from
// CreativeRegistry.tsx, which was already large before this landed.
//
// Every hard fact edited here is saved with source "team_verified" —
// Mario/his team is the one confirming it through this admin UI. There's
// no self-report path yet (that's the future intake-form flow) and no
// AI-inferred path yet either (future enrichment pipeline); both would
// plug into the same Fact<T> shape without changing this component.
// Clearing a field back to blank sends { value: null, source: null } —
// explicitly "unknown", never treated as a hard "no" by the (not yet
// built) feasibility filter.

const AUTHOR_NAME = "Mario"; // single shared admin, no per-admin accounts (see plan doc)

function emptyEditForm(service: CreativeService) {
  return {
    status: service.status,
    workDescription: service.workDescription,
    minBudgetAmount:
      service.hardFacts.minimumBudget.value != null ? String(service.hardFacts.minimumBudget.value.amount) : "",
    minBudgetCurrency: service.hardFacts.minimumBudget.value?.currency ?? "SAR",
    travelWillingness: (service.hardFacts.travelWillingness.value ?? "unknown") as TravelWillingness | "unknown",
    outdoorCapable:
      service.hardFacts.outdoorCapable.value === true
        ? "yes"
        : service.hardFacts.outdoorCapable.value === false
          ? "no"
          : "unknown",
    leadTimeDays: service.hardFacts.leadTimeDays.value != null ? String(service.hardFacts.leadTimeDays.value) : "",
    curatorNoteText: service.curatorNote?.text ?? "",
    budgetNote: service.budgetNote ?? "",
    verifiedFacts: service.verifiedFacts,
  };
}

type EditForm = ReturnType<typeof emptyEditForm>;

function factSummary(service: CreativeService): string[] {
  const parts: string[] = [];
  const budget = service.hardFacts.minimumBudget.value;
  if (budget) parts.push(`Min ${budget.currency} ${budget.amount.toLocaleString("en-US")}`);
  const travel = service.hardFacts.travelWillingness.value;
  if (travel) parts.push(travel === "local" ? "Local only" : travel === "regional" ? "Regional travel" : "Travels worldwide");
  if (service.hardFacts.outdoorCapable.value === true) parts.push("Outdoor-capable");
  if (service.hardFacts.outdoorCapable.value === false) parts.push("Indoor only");
  const lead = service.hardFacts.leadTimeDays.value;
  if (lead != null) parts.push(`${lead}d lead time`);
  return parts;
}

function ServiceCard({
  creative,
  service,
  password,
  onUpdated,
}: {
  creative: CreativeRegistryEntry;
  service: CreativeService;
  password: string;
  onUpdated: (creatives: CreativeRegistryEntry[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm>(() => emptyEditForm(service));
  const [newClientLabel, setNewClientLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const a = fieldAccent(service.creativeField);
  const summary = factSummary(service);

  function startEdit() {
    setForm(emptyEditForm(service));
    setEditing(true);
  }

  function addVerifiedFact() {
    if (!newClientLabel.trim()) return;
    const fact: VerifiedFact = {
      id: crypto.randomUUID(),
      kind: "past_client",
      label: newClientLabel.trim(),
      verifiedBy: AUTHOR_NAME,
      verifiedAt: Date.now(),
    };
    setForm((f) => ({ ...f, verifiedFacts: [...f.verifiedFacts, fact] }));
    setNewClientLabel("");
  }

  function removeVerifiedFact(id: string) {
    setForm((f) => ({ ...f, verifiedFacts: f.verifiedFacts.filter((v) => v.id !== id) }));
  }

  async function save() {
    setSaving(true);
    try {
      const { creatives } = await adminApi.updateCreativeService(password, creative.id, service.id, {
        status: form.status,
        workDescription: form.workDescription,
        budgetNote: form.budgetNote,
        hardFacts: {
          minimumBudget:
            form.minBudgetAmount.trim() === ""
              ? { value: null, source: null }
              : {
                  value: { amount: Number(form.minBudgetAmount), currency: form.minBudgetCurrency || "SAR" },
                  source: "team_verified",
                },
          travelWillingness:
            form.travelWillingness === "unknown"
              ? { value: null, source: null }
              : { value: form.travelWillingness, source: "team_verified" },
          outdoorCapable:
            form.outdoorCapable === "unknown"
              ? { value: null, source: null }
              : { value: form.outdoorCapable === "yes", source: "team_verified" },
          leadTimeDays:
            form.leadTimeDays.trim() === ""
              ? { value: null, source: null }
              : { value: Number(form.leadTimeDays), source: "team_verified" },
        },
        curatorNote: form.curatorNoteText.trim() ? { text: form.curatorNoteText.trim(), authorName: AUTHOR_NAME } : null,
        verifiedFacts: form.verifiedFacts,
      });
      onUpdated(creatives);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const { creatives } = await adminApi.deleteCreativeService(password, creative.id, service.id);
    onUpdated(creatives);
  }

  return (
    <div
      style={{
        border: `1px solid ${a.border}`,
        borderRadius: 8,
        padding: "10px 12px",
        background: "var(--color-background)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: a.dot, flexShrink: 0 }} />
        <strong style={{ fontSize: "0.82rem" }}>{service.serviceName}</strong>
        <span style={{ fontSize: "0.7rem", opacity: 0.55 }}>{service.creativeField}</span>
        {service.status === "inactive" && (
          <span className="pill" style={{ opacity: 0.6, fontSize: "0.62rem", padding: "1px 7px" }}>
            Inactive
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {!editing && !confirmingDelete && (
            <>
              <button className="btn-secondary" style={{ fontSize: "0.7rem", padding: "3px 9px" }} onClick={startEdit}>
                Edit
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: "0.7rem", padding: "3px 9px" }}
                onClick={() => setConfirmingDelete(true)}
              >
                Remove
              </button>
            </>
          )}
          {confirmingDelete && (
            <>
              <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>Remove this service?</span>
              <button style={{ fontSize: "0.7rem", padding: "3px 9px", background: "var(--overdue)" }} onClick={remove}>
                Confirm
              </button>
              <button
                className="btn-secondary"
                style={{ fontSize: "0.7rem", padding: "3px 9px" }}
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {!editing ? (
        <>
          {service.workDescription && (
            <p style={{ margin: "6px 0 0", fontSize: "0.78rem", opacity: 0.78 }}>{service.workDescription}</p>
          )}
          {summary.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {summary.map((s) => (
                <span key={s} className="pill" style={{ fontSize: "0.65rem", background: "var(--color-pill-bg)" }}>
                  {s}
                </span>
              ))}
            </div>
          )}
          {summary.length === 0 && (
            <p style={{ margin: "6px 0 0", fontSize: "0.72rem", opacity: 0.5, fontStyle: "italic" }}>
              No hard facts confirmed yet — budget, travel, outdoor, and lead time are all unknown.
            </p>
          )}
          {service.curatorNote && (
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "0.76rem",
                background: "var(--color-pill-bg)",
                borderRadius: 6,
                padding: "5px 9px",
              }}
            >
              <strong style={{ fontWeight: 600 }}>Curator's note:</strong> {service.curatorNote.text}
            </p>
          )}
          {service.budgetNote && (
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "0.76rem",
                fontStyle: "italic",
                opacity: 0.85,
                background: "var(--brass-tint, var(--color-pill-bg))",
                borderRadius: 6,
                padding: "5px 9px",
              }}
              title="What they wrote when a flat number was hard to give — the parsed budget number above (if any) was AI's best guess from this text."
            >
              <strong style={{ fontWeight: 600, fontStyle: "normal" }}>In their own words, on budget:</strong> "
              {service.budgetNote}"
            </p>
          )}
          {service.verifiedFacts.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
              {service.verifiedFacts.map((v) => (
                <span
                  key={v.id}
                  className="pill"
                  style={{ fontSize: "0.65rem", border: "1px solid var(--paid)", color: "var(--paid)" }}
                >
                  ✓ {v.label}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 16 }}>
            {(["active", "inactive"] as const).map((opt) => (
              <label key={opt} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem" }}>
                <input
                  type="radio"
                  name={`svc-status-${service.id}`}
                  checked={form.status === opt}
                  onChange={() => setForm((f) => ({ ...f, status: opt }))}
                />
                {opt === "active" ? "Active" : "Inactive"}
              </label>
            ))}
          </div>

          <div>
            <label style={{ fontSize: "0.75rem" }}>Work description</label>
            <textarea
              rows={2}
              value={form.workDescription}
              onChange={(e) => setForm((f) => ({ ...f, workDescription: e.target.value }))}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: "0.72rem" }}>Min. budget</label>
              <input
                type="number"
                placeholder="Unknown"
                value={form.minBudgetAmount}
                onChange={(e) => setForm((f) => ({ ...f, minBudgetAmount: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem" }}>Currency</label>
              <input
                value={form.minBudgetCurrency}
                onChange={(e) => setForm((f) => ({ ...f, minBudgetCurrency: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem" }}>Travel</label>
              <select
                value={form.travelWillingness}
                onChange={(e) =>
                  setForm((f) => ({ ...f, travelWillingness: e.target.value as TravelWillingness | "unknown" }))
                }
              >
                <option value="unknown">Unknown</option>
                <option value="local">Local only</option>
                <option value="regional">Regional</option>
                <option value="worldwide">Worldwide</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.72rem" }}>Lead time (days)</label>
              <input
                type="number"
                placeholder="Unknown"
                value={form.leadTimeDays}
                onChange={(e) => setForm((f) => ({ ...f, leadTimeDays: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.72rem" }}>Outdoor-capable?</label>
            <div style={{ display: "flex", gap: 14, marginTop: 4 }}>
              {(["unknown", "yes", "no"] as const).map((opt) => (
                <label key={opt} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.78rem" }}>
                  <input
                    type="radio"
                    name={`svc-outdoor-${service.id}`}
                    checked={form.outdoorCapable === opt}
                    onChange={() => setForm((f) => ({ ...f, outdoorCapable: opt }))}
                  />
                  {opt === "unknown" ? "Unknown" : opt === "yes" ? "Yes" : "No"}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.72rem" }}>Curator's note (internal — this service only)</label>
            <textarea
              rows={2}
              value={form.curatorNoteText}
              onChange={(e) => setForm((f) => ({ ...f, curatorNoteText: e.target.value }))}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.72rem" }}>Their own words on budget (from the intake flow, editable)</label>
            <textarea
              rows={2}
              placeholder="Filled in automatically if they wrote a free-text budget answer"
              value={form.budgetNote}
              onChange={(e) => setForm((f) => ({ ...f, budgetNote: e.target.value }))}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.72rem" }}>Verified past clients</label>
            {form.verifiedFacts.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4, marginBottom: 6 }}>
                {form.verifiedFacts.map((v) => (
                  <span
                    key={v.id}
                    className="pill"
                    style={{ fontSize: "0.68rem", display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    ✓ {v.label}
                    <button
                      type="button"
                      onClick={() => removeVerifiedFact(v.id)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: "inherit",
                        opacity: 0.6,
                        fontSize: "0.75rem",
                      }}
                      aria-label={`Remove ${v.label}`}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <input
                placeholder="e.g. STC, Riyadh Season"
                value={newClientLabel}
                onChange={(e) => setNewClientLabel(e.target.value)}
                style={{ fontSize: "0.8rem" }}
              />
              <button
                type="button"
                className="btn-secondary"
                style={{ fontSize: "0.75rem", padding: "6px 10px" }}
                onClick={addVerifiedFact}
                disabled={!newClientLabel.trim()}
              >
                + Add
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ fontSize: "0.78rem", padding: "6px 12px" }} onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save service"}
            </button>
            <button
              className="btn-secondary"
              style={{ fontSize: "0.78rem", padding: "6px 12px" }}
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddServiceForm({
  creative,
  password,
  onUpdated,
  onDone,
}: {
  creative: CreativeRegistryEntry;
  password: string;
  onUpdated: (creatives: CreativeRegistryEntry[]) => void;
  onDone: () => void;
}) {
  const [field, setField] = useState(creative.creativeFields[0] ?? CREATIVE_FIELDS[0]);
  const [serviceName, setServiceName] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const options = CREATIVE_TAXONOMY[field] ?? [];

  async function submit() {
    if (!serviceName) return;
    setSaving(true);
    try {
      const { creatives } = await adminApi.addCreativeService(password, creative.id, {
        creativeField: field,
        serviceName,
        workDescription: workDescription.trim() || undefined,
      });
      onUpdated(creatives);
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ border: "1px dashed var(--color-pill-bg)", borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={{ fontSize: "0.72rem" }}>Creative field</label>
          <select
            value={field}
            onChange={(e) => {
              setField(e.target.value);
              setServiceName("");
            }}
          >
            {CREATIVE_FIELDS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "0.72rem" }}>Service</label>
          <select value={serviceName} onChange={(e) => setServiceName(e.target.value)}>
            <option value="">Choose a service…</option>
            {options.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: "0.72rem" }}>Work description (optional)</label>
        <textarea rows={2} value={workDescription} onChange={(e) => setWorkDescription(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button style={{ fontSize: "0.78rem", padding: "6px 12px" }} onClick={submit} disabled={saving || !serviceName}>
          {saving ? "Adding…" : "Add service"}
        </button>
        <button className="btn-secondary" style={{ fontSize: "0.78rem", padding: "6px 12px" }} onClick={onDone} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function CreativeServicesPanel({
  creative,
  password,
  onUpdated,
}: {
  creative: CreativeRegistryEntry;
  password: string;
  onUpdated: (creatives: CreativeRegistryEntry[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const services = creative.services ?? [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <label style={{ margin: 0 }}>
          Services {services.length > 0 ? `(${services.length})` : ""}
        </label>
        {!adding && (
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: "0.72rem", padding: "3px 9px", marginLeft: "auto" }}
            onClick={() => setAdding(true)}
          >
            + Add service
          </button>
        )}
      </div>

      {services.length === 0 && !adding && (
        <p style={{ fontSize: "0.78rem", opacity: 0.55, fontStyle: "italic", margin: 0 }}>
          {creative.services === undefined
            ? "Not migrated to per-service records yet — add one to get started, or use the registry-wide upgrade above."
            : "No services yet."}
        </p>
      )}

      <div style={{ display: "grid", gap: 8, marginTop: services.length > 0 ? 4 : 0 }}>
        {services.map((service) => (
          <ServiceCard key={service.id} creative={creative} service={service} password={password} onUpdated={onUpdated} />
        ))}
        {adding && (
          <AddServiceForm creative={creative} password={password} onUpdated={onUpdated} onDone={() => setAdding(false)} />
        )}
      </div>
    </div>
  );
}
