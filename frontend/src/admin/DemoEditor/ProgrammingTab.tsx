import { useState } from "react";
import * as adminApi from "../../api/adminApi";
import type { DemoRecord, ProgrammingStatus } from "../../types";
import creativeRoster from "../../data/creativeRoster.json";

interface Props {
  demo: DemoRecord;
  password: string;
  onSaved: (demo: DemoRecord) => void;
}

const STATUS_OPTIONS: ProgrammingStatus[] = ["proposed", "confirmed", "cancelled"];

export function ProgrammingTab({ demo, password, onSaved }: Props) {
  const [rosterCreativeId, setRosterCreativeId] = useState("");
  const [priceQuoted, setPriceQuoted] = useState("");
  const [locationId, setLocationId] = useState("");
  const [date, setDate] = useState("");
  const [adding, setAdding] = useState(false);

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
