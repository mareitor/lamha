import { useState } from "react";
import * as adminApi from "../../api/adminApi";
import type { DemoRecord } from "../../types";

interface Props {
  demo: DemoRecord;
  password: string;
  onSaved: (demo: DemoRecord) => void;
}

// Admin-managed venue profiles that power the client-facing Locations
// tab and the Season Agenda's location filter. Seeded with four Riyadh
// defaults on demo creation (worker/lib/kv.ts) — fully editable here.
export function LocationsTab({ demo, password, onSaved }: Props) {
  const [name, setName] = useState("");
  const [formats, setFormats] = useState("");
  const [whyItWorks, setWhyItWorks] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setAdding(true);
    try {
      const updated = await adminApi.addLocation(password, demo.id, {
        name: name.trim(),
        formats: formats.split(",").map((f) => f.trim()).filter(Boolean),
        whyItWorks: whyItWorks.trim(),
      });
      onSaved(updated);
      setName("");
      setFormats("");
      setWhyItWorks("");
    } finally {
      setAdding(false);
    }
  }

  async function remove(itemId: string) {
    onSaved(await adminApi.deleteLocation(password, demo.id, itemId));
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Add a location</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label>Name</label>
            <input placeholder="e.g. KAFD Plaza" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label>Formats (comma-separated)</label>
            <input placeholder="Outdoor, Plaza" value={formats} onChange={(e) => setFormats(e.target.value)} />
          </div>
          <div style={{ flex: 2, minWidth: 220 }}>
            <label>Why it works</label>
            <input
              placeholder="High-footfall business district plaza…"
              value={whyItWorks}
              onChange={(e) => setWhyItWorks(e.target.value)}
            />
          </div>
          <button onClick={handleAdd} disabled={adding || !name.trim()}>
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      </div>

      {demo.locations.length === 0 ? (
        <p>No locations yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {demo.locations.map((loc) => (
            <div key={loc.id} className="card" style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <strong>{loc.name}</strong>
                {loc.formats.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {loc.formats.map((f) => (
                      <span key={f} className="pill">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
                {loc.whyItWorks && (
                  <p style={{ margin: "8px 0 0", fontSize: "0.85rem", opacity: 0.78 }}>{loc.whyItWorks}</p>
                )}
              </div>
              <button className="btn-secondary" onClick={() => remove(loc.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
