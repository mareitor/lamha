import type { DemoRecord } from "../../types";
import creativeRoster from "../../data/creativeRoster.json";
import { CreativeAvatar } from "../shared/CreativeAvatar";
import { fieldColor } from "./fieldColors";
import { formatShortDate } from "./dateUtils";

// Every creative in the shared roster, cross-referenced against this
// demo's programming so a booked creative shows their real status and
// scheduled dates, and an unbooked one reads as "Available".
export function CreativeLineup({ demo }: { demo: DemoRecord }) {
  return (
    <div>
      <p style={{ fontSize: "0.86rem", opacity: 0.68, maxWidth: "68ch", marginBottom: 16 }}>
        Every creative in the roster, with what's already booked for this season pulled in automatically.
      </p>
      <div style={{ overflowX: "auto", borderRadius: "var(--r-card)", boxShadow: "var(--shadow-card)", border: "1px solid rgba(20,35,29,.04)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--color-surface)", minWidth: 860 }}>
          <thead>
            <tr>
              {["Creative", "Field", "Service", "About", "Estimated price", "Scheduled", "Status"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    background: "var(--color-background)",
                    fontSize: "0.68rem",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    opacity: 0.62,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {creativeRoster.map((creative) => {
              const bookings = demo.programming.filter((p) => p.rosterCreativeId === creative.id);
              return (
                <tr key={creative.id} style={{ borderTop: "1px solid var(--color-line)" }}>
                  <td style={{ padding: 14, verticalAlign: "top" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <CreativeAvatar initials={creative.avatarStyle.initials} colorSeed={creative.avatarStyle.colorSeed} size={34} />
                      <strong style={{ fontSize: "0.88rem" }}>{creative.name}</strong>
                    </div>
                  </td>
                  <td style={{ padding: 14, verticalAlign: "top", fontSize: "0.85rem" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: fieldColor(creative.creativeField), flexShrink: 0 }} />
                      {creative.creativeField}
                    </span>
                  </td>
                  <td style={{ padding: 14, verticalAlign: "top", fontSize: "0.85rem" }}>{creative.creativeService}</td>
                  <td style={{ padding: 14, verticalAlign: "top", maxWidth: 240, opacity: 0.78, lineHeight: 1.45, fontSize: "0.82rem" }}>
                    {creative.bioBlurb}
                  </td>
                  <td style={{ padding: 14, verticalAlign: "top", fontSize: "0.85rem", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                    {creative.priceRangeMin.toLocaleString()}–{creative.priceRangeMax.toLocaleString()} {creative.currency}
                  </td>
                  <td style={{ padding: 14, verticalAlign: "top", fontSize: "0.82rem" }}>
                    {bookings.length === 0 ? (
                      <span style={{ opacity: 0.45 }}>—</span>
                    ) : (
                      bookings.map((b) => (
                        <div key={b.id}>{b.date ? formatShortDate(b.date) : "Date TBD"}</div>
                      ))
                    )}
                  </td>
                  <td style={{ padding: 14, verticalAlign: "top" }}>
                    {bookings.length === 0 ? (
                      <span className="pill" style={{ background: "var(--color-pill-bg)", opacity: 0.7 }}>
                        Available
                      </span>
                    ) : (
                      bookings.map((b) => (
                        <div key={b.id} style={{ marginBottom: 4 }}>
                          <span className="pill">{b.status}</span>
                        </div>
                      ))
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
