import type { DemoRecord, ProgrammingEntry } from "../../types";
import { fieldColor } from "./fieldColors";
import { formatDayLabel } from "./dateUtils";

export function ActivitiesModal({
  iso,
  entries,
  locations,
  onClose,
}: {
  iso: string;
  entries: ProgrammingEntry[];
  locations: DemoRecord["locations"];
  onClose: () => void;
}) {
  function locationName(id: string | null): string | null {
    if (!id) return null;
    return locations.find((l) => l.id === id)?.name ?? null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,35,29,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "var(--shadow-frame)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ margin: 0 }}>Activities</h3>
            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--brass)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginTop: 5,
              }}
            >
              {formatDayLabel(iso)}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", boxShadow: "none", color: "var(--color-primary)", opacity: 0.5, fontSize: "1.2rem", padding: "2px 4px" }}
          >
            ✕
          </button>
        </div>

        {entries.length === 0 ? (
          <p style={{ fontSize: "0.86rem", opacity: 0.6, padding: "10px 0 0" }}>Nothing scheduled this day.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} style={{ border: "1px solid var(--color-line)", borderRadius: 10, padding: "14px 16px", marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: fieldColor(entry.creativeField), flexShrink: 0 }} />
                <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>{entry.name}</div>
              </div>
              <div style={{ fontSize: "0.78rem", opacity: 0.65, marginBottom: 8 }}>
                {entry.creativeService}
                {locationName(entry.locationId) ? ` · ${locationName(entry.locationId)}` : ""}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="pill">{entry.status}</span>
                <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                  {entry.priceQuoted.toLocaleString()} {entry.currency}
                </span>
              </div>
              {entry.notes && <p style={{ fontSize: "0.83rem", opacity: 0.8, lineHeight: 1.5, margin: "8px 0 0" }}>{entry.notes}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
