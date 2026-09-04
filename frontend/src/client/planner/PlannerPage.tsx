import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { DemoRecord } from "../../types";
import { useTheme } from "../../theme/ThemeProvider";
import { SeasonAgenda } from "./SeasonAgenda";
import { CreativeLineup } from "./CreativeLineup";
import { LocationsPanel } from "./LocationsPanel";

type Section = "agenda" | "lineup" | "locations";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "agenda", label: "Season Agenda" },
  { key: "lineup", label: "Creative Lineup" },
  { key: "locations", label: "Locations" },
];

// For engagements that run longer than one weekend, this is where
// clients watch the season come together — the same programming list as
// the dashboard, laid out across the full window instead of one
// activation. A single-weekend booking uses this same screen; it just
// has fewer rows (Mario, Sept 2026).
export function PlannerPage({ demo }: { demo: DemoRecord }) {
  const { demoId } = useParams<{ demoId: string }>();
  const theme = useTheme();
  const [section, setSection] = useState<Section>("agenda");

  const stats = useMemo(() => {
    const confirmedCreatives = new Set(
      demo.programming.filter((p) => p.status === "confirmed" && p.rosterCreativeId).map((p) => p.rosterCreativeId),
    );
    const scheduled = demo.programming.filter((p) => !!p.date);
    const months = new Set(scheduled.map((p) => p.date!.slice(0, 7)));
    return {
      creativesConfirmed: confirmedCreatives.size,
      actsScheduled: scheduled.length,
      monthsProgrammed: months.size,
    };
  }, [demo.programming]);

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 24 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        <Link to={`/${demoId}`}>
          <button className="btn-secondary" style={{ fontSize: "0.82rem" }}>
            Dashboard
          </button>
        </Link>
        <button style={{ fontSize: "0.82rem" }}>Planner</button>
      </div>

      <header style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 6 }}>
        <img src={theme.logoUrl} alt={theme.companyDisplayName} style={{ height: 36, maxWidth: 140, objectFit: "contain" }} />
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Season curation</h1>
          <p style={{ margin: "2px 0 0", fontSize: "0.85rem", opacity: 0.75 }}>
            {demo.event.startDate}
            {demo.event.endDate && demo.event.endDate !== demo.event.startDate ? ` – ${demo.event.endDate}` : ""}
            {demo.event.location ? ` · ${demo.event.location}` : ""}
          </p>
        </div>
      </header>

      <p style={{ fontSize: "0.86rem", opacity: 0.68, maxWidth: "60ch", margin: "14px 0 0" }}>
        For engagements that run longer than one weekend, this is where you watch the season come
        together — the same programming as your dashboard, laid out across the full window.
      </p>

      <div className="planner-stats">
        <StatTile num={stats.creativesConfirmed} label="Creatives confirmed" />
        <StatTile num={stats.actsScheduled} label="Acts scheduled" />
        <StatTile num={stats.monthsProgrammed} label="Months programmed" />
      </div>

      <div style={{ display: "flex", gap: 30, borderBottom: "1px solid var(--color-line)", margin: "6px 0 26px" }}>
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSection(s.key)}
            style={{
              border: "none",
              background: "transparent",
              boxShadow: "none",
              padding: "0 0 13px",
              marginBottom: -1,
              fontSize: "0.92rem",
              fontWeight: 600,
              color: "var(--color-primary)",
              opacity: section === s.key ? 1 : 0.5,
              borderBottom: section === s.key ? "2px solid var(--brass)" : "2px solid transparent",
              borderRadius: 0,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "agenda" && <SeasonAgenda demo={demo} />}
      {section === "lineup" && <CreativeLineup demo={demo} />}
      {section === "locations" && <LocationsPanel demo={demo} />}
    </div>
  );
}

function StatTile({ num, label }: { num: number; label: string }) {
  return (
    <div className="card">
      <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.9rem", fontWeight: 500, color: "var(--color-ink-deep)", fontVariantNumeric: "tabular-nums" }}>
        {num}
      </div>
      <div style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", opacity: 0.58, marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}
