import { useState } from "react";
import * as adminApi from "../../api/adminApi";
import type { DemoRecord, ProgrammingStatus } from "../../types";
import artistRoster from "../../data/artistRoster.json";

interface Props {
  demo: DemoRecord;
  password: string;
  onSaved: (demo: DemoRecord) => void;
}

const STATUS_OPTIONS: ProgrammingStatus[] = ["proposed", "confirmed", "cancelled"];

export function ProgrammingTab({ demo, password, onSaved }: Props) {
  const [rosterArtistId, setRosterArtistId] = useState("");
  const [priceQuoted, setPriceQuoted] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    const artist = artistRoster.find((a) => a.id === rosterArtistId);
    if (!artist) return;
    setAdding(true);
    try {
      const updated = await adminApi.addProgramming(password, demo.id, {
        rosterArtistId: artist.id,
        name: artist.name,
        category: artist.category,
        priceQuoted: priceQuoted ? Number(priceQuoted) : artist.priceRangeMin,
        currency: demo.budget.currency,
        status: "proposed",
      });
      onSaved(updated);
      setRosterArtistId("");
      setPriceQuoted("");
    } finally {
      setAdding(false);
    }
  }

  async function updateStatus(itemId: string, status: ProgrammingStatus) {
    onSaved(await adminApi.updateProgramming(password, demo.id, itemId, { status }));
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
            <label>Artist</label>
            <select value={rosterArtistId} onChange={(e) => setRosterArtistId(e.target.value)}>
              <option value="">Select an artist…</option>
              {artistRoster.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.category}
                </option>
              ))}
            </select>
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
          <button onClick={handleAdd} disabled={adding || !rosterArtistId}>
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      </div>

      {demo.programming.length === 0 ? (
        <p>No programming added yet.</p>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "var(--color-background)" }}>
                <th style={{ padding: 12 }}>Artist</th>
                <th style={{ padding: 12 }}>Category</th>
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
                  <td style={{ padding: 12 }}>{entry.category}</td>
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
