import type { DemoRecord } from "../../types";

// Replaces the client-facing Invoices tab (Sept 2026, Mario) -- a raw
// invoice list wasn't something a client actually wanted to check on;
// "where does our season stand" is. Invoices themselves aren't gone --
// they're still tracked admin-side via the DemoEditor's Invoices tab,
// just no longer surfaced to the client dashboard.
export function SeasonAtAGlance({ demo }: { demo: DemoRecord }) {
  const confirmed = demo.programming.filter((p) => p.status === "confirmed");
  const confirmedDates = new Set(confirmed.map((p) => p.date).filter((d): d is string => Boolean(d)));
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = confirmed
    .filter((p): p is typeof p & { date: string } => Boolean(p.date) && p.date! >= today)
    .sort((a, b) => (a.date! < b.date! ? -1 : 1));
  const next = upcoming[0];

  function daysUntil(dateStr: string): number {
    const target = new Date(`${dateStr}T00:00:00`);
    const now = new Date(`${today}T00:00:00`);
    return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <section style={{ marginTop: 40, marginBottom: 40 }}>
      <h2>Season at a glance</h2>
      <div
        className="card"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 20,
        }}
      >
        <Stat label="Confirmed acts" value={String(confirmed.length)} />
        <Stat label="Dates locked" value={String(confirmedDates.size)} />
        <Stat
          label="Next activation"
          value={next ? `${daysUntil(next.date)} days` : "—"}
          sub={next ? next.date : undefined}
        />
        {demo.event.startDate && (
          <Stat
            label="Season runs"
            value={`${demo.event.startDate}${demo.event.endDate ? ` – ${demo.event.endDate}` : ""}`}
          />
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.65 }}>
        {label}
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>{sub}</div>}
    </div>
  );
}
