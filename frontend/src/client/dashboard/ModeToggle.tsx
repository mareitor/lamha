import type { DemoRecord } from "../../types";

// Self-service is shown as a closed-beta option: clients can see it
// exists but can't turn it on themselves anymore (Mario, Sept 2026) —
// if they want it, they talk to the team, who flips it from the admin
// console (DemoEditor's Mode tab still has the real toggle). This
// component no longer calls demoApi.setMode at all; it's read-only.
export function ModeToggle({ demo }: { demo: DemoRecord; onUpdated?: (demo: DemoRecord) => void }) {
  const isSelfService = demo.mode === "self-service";

  return (
    <div className="card dark-panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div>
        <strong>{isSelfService ? "You're in self-service mode" : "We're managing this for you"}</strong>
        <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.85rem", maxWidth: "46ch" }}>
          {isSelfService
            ? "You can edit your own creatives, programming, and budget below."
            : "Our team runs your programming and budget end to end. Want to manage it yourself instead? Talk to us."}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          className={!isSelfService ? "" : "btn-secondary"}
          disabled
          style={isSelfService ? { borderColor: "var(--color-on-dark)", color: "var(--color-on-dark)" } : undefined}
        >
          Fully managed
        </button>
        <span
          title="Self-service is in closed beta — reach out to our team to enable it."
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            border: "1.5px solid rgba(255,255,255,.2)",
            borderRadius: "var(--radius-sm)",
            padding: "8.5px 16px",
            fontSize: "0.84rem",
            fontWeight: 600,
            color: "var(--color-on-dark-muted)",
            cursor: "not-allowed",
          }}
        >
          Self-service
          <span
            style={{
              fontSize: "0.62rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "var(--color-on-dark-muted)",
              border: "1px solid rgba(255,255,255,.2)",
              borderRadius: 100,
              padding: "2px 7px",
            }}
          >
            Closed beta
          </span>
        </span>
      </div>
    </div>
  );
}
