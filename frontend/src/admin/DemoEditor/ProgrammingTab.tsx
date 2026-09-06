import { useState, type ChangeEvent } from "react";
import * as adminApi from "../../api/adminApi";
import type { DemoRecord, ProgrammingEntry, ProgrammingStatus } from "../../types";
import creativeRoster from "../../data/creativeRoster.json";

interface Props {
  demo: DemoRecord;
  password: string;
  onSaved: (demo: DemoRecord) => void;
}

const STATUS_OPTIONS: ProgrammingStatus[] = ["proposed", "confirmed", "cancelled"];

function IconUpload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4" />
      <path d="M6 10l6-6 6 6" />
      <path d="M4 20h16" />
    </svg>
  );
}

// Visually hidden but still focusable/clickable — see the matching const
// in CreativeRegistry.tsx (same pattern, kept local here since it's the
// only other place a file-input-as-a-text-link is used).
const srOnlyFileInput = {
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

export function ProgrammingTab({ demo, password, onSaved }: Props) {
  const [rosterCreativeId, setRosterCreativeId] = useState("");
  const [priceQuoted, setPriceQuoted] = useState("");
  const [locationId, setLocationId] = useState("");
  const [date, setDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importAdded, setImportAdded] = useState<number | null>(null);

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError(null);
    setImportAdded(null);
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
        throw new Error("Expected a JSON array of programming entries.");
      }
      const { demo: updated, added } = await adminApi.importProgramming(
        password,
        demo.id,
        parsed as (Partial<ProgrammingEntry> & { locationName?: string })[],
      );
      onSaved(updated);
      setImportAdded(added);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  async function handleAdd() {
    const creative = creativeRoster.find((a) => a.id === rosterCreativeId);
    if (!creative) return;
    setAdding(true);
    try {
      const updated = await adminApi.addProgramming(password, demo.id, {
        rosterCreativeId: creative.id,
        name: creative.name,
        creativeField: creative.creativeField,
        creativeService: creative.creativeService,
        locationId: locationId || null,
        date: date || null,
        priceQuoted: priceQuoted ? Number(priceQuoted) : creative.priceRangeMin,
        currency: demo.budget.currency,
        status: "proposed",
      });
      onSaved(updated);
      setRosterCreativeId("");
      setPriceQuoted("");
      setLocationId("");
      setDate("");
    } finally {
      setAdding(false);
    }
  }

  async function updateStatus(itemId: string, status: ProgrammingStatus) {
    onSaved(await adminApi.updateProgramming(password, demo.id, itemId, { status }));
  }

  async function updateLocation(itemId: string, newLocationId: string) {
    onSaved(await adminApi.updateProgramming(password, demo.id, itemId, { locationId: newLocationId || null }));
  }

  async function remove(itemId: string) {
    onSaved(await adminApi.deleteProgramming(password, demo.id, itemId));
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            margin: 0,
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "var(--color-primary)",
            opacity: importing ? 0.5 : 0.75,
            cursor: importing ? "not-allowed" : "pointer",
          }}
        >
          <IconUpload />
          {importing ? "Importing…" : "Import season from file"}
          <input
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            disabled={importing}
            style={srOnlyFileInput}
          />
        </label>
      </div>

      {importError && <p style={{ color: "#B23A48" }}>{importError}</p>}
      {importAdded !== null && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            padding: "10px 16px",
            background: "var(--paid-bg)",
            border: "1px solid var(--paid)",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.85rem" }}>
            Imported <strong>{importAdded}</strong> programming {importAdded === 1 ? "entry" : "entries"}.
          </p>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Add from roster</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label>Creative</label>
            <select value={rosterCreativeId} onChange={(e) => setRosterCreativeId(e.target.value)}>
              <option value="">Select a creative…</option>
              {creativeRoster.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.creativeService}
                </option>
              ))}
            </select>
          </div>
          <div style={{ width: 180 }}>
            <label>Location</label>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">Unassigned</option>
              {demo.locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ width: 160 }}>
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div style={{ width: 160 }}>
            <label>Price quoted</label>
            <input
              type="number"
              placeholder="e.g. 20000"
              value={priceQuoted}
              onChange={(e) => setPriceQuoted(e.target.value)}
            />
          </div>
          <button onClick={handleAdd} disabled={adding || !rosterCreativeId}>
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      </div>

      {demo.programming.length === 0 ? (
        <p>No programming added yet.</p>
      ) : (
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "var(--color-background)" }}>
                <th style={{ padding: 12 }}>Creative</th>
                <th style={{ padding: 12 }}>Field</th>
                <th style={{ padding: 12 }}>Service</th>
                <th style={{ padding: 12 }}>Location</th>
                <th style={{ padding: 12 }}>Date</th>
                <th style={{ padding: 12 }}>Price</th>
                <th style={{ padding: 12 }}>Added by</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}></th>
              </tr>
            </thead>
            <tbody>
              {demo.programming.map((entry) => (
                <tr key={entry.id} style={{ borderTop: "1px solid var(--color-pill-bg)" }}>
                  <td style={{ padding: 12 }}>{entry.name}</td>
                  <td style={{ padding: 12 }}>{entry.creativeField}</td>
                  <td style={{ padding: 12 }}>{entry.creativeService}</td>
                  <td style={{ padding: 12 }}>
                    <select value={entry.locationId ?? ""} onChange={(e) => updateLocation(entry.id, e.target.value)}>
                      <option value="">Unassigned</option>
                      {demo.locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: 12 }}>{entry.date || "—"}</td>
                  <td style={{ padding: 12 }}>
                    {entry.priceQuoted.toLocaleString()} {entry.currency}
                  </td>
                  <td style={{ padding: 12 }}>{entry.addedBy}</td>
                  <td style={{ padding: 12 }}>
                    <select value={entry.status} onChange={(e) => updateStatus(entry.id, e.target.value as ProgrammingStatus)}>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: 12, textAlign: "right" }}>
                    <button className="btn-secondary" onClick={() => remove(entry.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
