import type { DemoRecord } from "../../types";

export function LocationsPanel({ demo }: { demo: DemoRecord }) {
  if (demo.locations.length === 0) {
    return <p style={{ opacity: 0.65 }}>No locations set up for this season yet.</p>;
  }

  return (
    <div>
      <p style={{ fontSize: "0.86rem", opacity: 0.68, maxWidth: "68ch", marginBottom: 16 }}>
        Reusable venue profiles this season draws from — the same locations that power the filter above.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {demo.locations.map((loc) => (
          <div key={loc.id} className="card">
            <h3 style={{ fontSize: "1.05rem", marginBottom: 10 }}>{loc.name}</h3>
            {loc.formats.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {loc.formats.map((f) => (
                  <span key={f} className="pill">
                    {f}
                  </span>
                ))}
              </div>
            )}
            {loc.whyItWorks && (
              <>
                <div style={{ fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.5, marginBottom: 6 }}>
                  Why it works
                </div>
                <p style={{ fontSize: "0.84rem", opacity: 0.78, lineHeight: 1.5, margin: 0 }}>{loc.whyItWorks}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
