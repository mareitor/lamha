import { useMemo, useState } from "react";
import type { DemoRecord, ProgrammingEntry } from "../../types";
import { fieldColor, CREATIVE_FIELDS } from "./fieldColors";
import creativeRoster from "../../data/creativeRoster.json";
import { ActivitiesModal } from "./ActivitiesModal";
import {
  addDays,
  addMonths,
  formatMonthLabel,
  formatShortDate,
  formatWeekRangeLabel,
  monthGrid,
  parseISODate,
  startOfWeek,
  weekGrid,
} from "./dateUtils";

type ViewMode = "month" | "week" | "list";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const ALL_SERVICES = Array.from(new Set(creativeRoster.map((c) => c.creativeService))).sort();

export function SeasonAgenda({ demo }: { demo: DemoRecord }) {
  const anchorDate = demo.event.startDate ? parseISODate(demo.event.startDate) : new Date();
  const [view, setView] = useState<ViewMode>("month");
  const [monthCursor, setMonthCursor] = useState({ year: anchorDate.getFullYear(), month: anchorDate.getMonth() });
  const [weekCursor, setWeekCursor] = useState(() => startOfWeek(anchorDate));
  const [activeLocationIds, setActiveLocationIds] = useState<Set<string>>(new Set());
  const [unfilledOnly, setUnfilledOnly] = useState(false);
  const [fieldFilter, setFieldFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [openDay, setOpenDay] = useState<string | null>(null);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, ProgrammingEntry[]>();
    for (const entry of demo.programming) {
      if (!entry.date) continue;
      const list = map.get(entry.date) ?? [];
      list.push(entry);
      map.set(entry.date, list);
    }
    return map;
  }, [demo.programming]);

  function matches(entry: ProgrammingEntry): boolean {
    const locationOk = activeLocationIds.size === 0 || (!!entry.locationId && activeLocationIds.has(entry.locationId));
    const fieldOk = !fieldFilter || entry.creativeField === fieldFilter;
    const serviceOk = !serviceFilter || entry.creativeService === serviceFilter;
    return locationOk && fieldOk && serviceOk;
  }

  function toggleLocation(id: string) {
    setActiveLocationIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function locationName(id: string | null): string | null {
    if (!id) return null;
    return demo.locations.find((l) => l.id === id)?.name ?? null;
  }

  const hasAnyFilter = activeLocationIds.size > 0 || !!fieldFilter || !!serviceFilter;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, margin: "8px 0 20px" }}>
        <div style={{ display: "flex", gap: 3, background: "var(--color-pill-bg)", borderRadius: 9, padding: 3 }}>
          {(["month", "week", "list"] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              style={{
                border: "none",
                background: view === v ? "var(--color-surface)" : "transparent",
                color: view === v ? "var(--color-primary)" : "var(--color-primary)",
                boxShadow: view === v ? "0 1px 2px rgba(20,35,29,.1)" : "none",
                padding: "7px 15px",
                borderRadius: 7,
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              {v === "month" ? "Month view" : v === "week" ? "Week view" : "List view"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn-secondary"
            title="Exports a real spreadsheet in the live app — this preview doesn't download files"
          >
            ⬇ Export Excel
          </button>
          <button
            type="button"
            className="btn-secondary"
            title="Exports a shareable PDF of this view in the live app — this preview doesn't download files"
          >
            Export view
          </button>
        </div>
      </div>

      {demo.locations.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 9, marginBottom: 10 }}>
          <span style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.55 }}>
            Filter by location:
          </span>
          {demo.locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => toggleLocation(loc.id)}
              style={{
                border: `1px solid ${activeLocationIds.has(loc.id) ? "var(--color-ink-deep)" : "var(--color-line)"}`,
                background: activeLocationIds.has(loc.id) ? "var(--color-ink-deep)" : "var(--color-surface)",
                color: activeLocationIds.has(loc.id) ? "var(--color-on-dark)" : "var(--color-primary)",
                borderRadius: 100,
                padding: "6px 14px",
                fontSize: "0.78rem",
                fontWeight: 600,
                boxShadow: "none",
              }}
            >
              {loc.name}
            </button>
          ))}
          {hasAnyFilter && (
            <button
              type="button"
              onClick={() => {
                setActiveLocationIds(new Set());
                setFieldFilter("");
                setServiceFilter("");
              }}
              style={{ background: "none", boxShadow: "none", color: "var(--color-accent)", textDecoration: "underline", padding: "6px 4px", fontSize: "0.78rem", fontWeight: 600 }}
            >
              Show all
            </button>
          )}
          <button
            type="button"
            onClick={() => setUnfilledOnly((v) => !v)}
            style={{
              marginLeft: "auto",
              border: `1px solid ${unfilledOnly ? "var(--color-ink-deep)" : "var(--color-line)"}`,
              background: unfilledOnly ? "var(--color-ink-deep)" : "var(--color-surface)",
              color: unfilledOnly ? "var(--color-on-dark)" : "var(--color-primary)",
              borderRadius: 100,
              padding: "6px 14px",
              fontSize: "0.78rem",
              fontWeight: 600,
              boxShadow: "none",
            }}
          >
            Show unfilled only
          </button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 9, marginBottom: 16 }}>
        <span style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.55 }}>
          Filter by:
        </span>
        <select value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)} style={{ width: "auto", minWidth: 170 }}>
          <option value="">All Creative Fields</option>
          {CREATIVE_FIELDS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} style={{ width: "auto", minWidth: 190 }}>
          <option value="">All Creative Services</option>
          {ALL_SERVICES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 22 }}>
        {CREATIVE_FIELDS.map((f) => (
          <span key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.76rem", opacity: 0.68 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: fieldColor(f), flexShrink: 0 }} />
            {f}
          </span>
        ))}
      </div>

      {view === "month" && (
        <MonthCalendar
          year={monthCursor.year}
          month={monthCursor.month}
          entriesByDate={entriesByDate}
          matches={matches}
          unfilledOnly={unfilledOnly}
          onNav={(delta) => setMonthCursor((c) => addMonths(c.year, c.month, delta))}
          onOpenDay={setOpenDay}
        />
      )}

      {view === "week" && (
        <WeekCalendar
          weekStart={weekCursor}
          entriesByDate={entriesByDate}
          matches={matches}
          unfilledOnly={unfilledOnly}
          locationName={locationName}
          onNav={(delta) => setWeekCursor((c) => addDays(c, delta * 7))}
          onOpenDay={setOpenDay}
        />
      )}

      {view === "list" && <ListAgenda entries={demo.programming} matches={matches} locationName={locationName} />}

      {openDay && (
        <ActivitiesModal
          iso={openDay}
          entries={entriesByDate.get(openDay) ?? []}
          locations={demo.locations}
          onClose={() => setOpenDay(null)}
        />
      )}
    </div>
  );
}

function MonthCalendar({
  year,
  month,
  entriesByDate,
  matches,
  unfilledOnly,
  onNav,
  onOpenDay,
}: {
  year: number;
  month: number;
  entriesByDate: Map<string, ProgrammingEntry[]>;
  matches: (e: ProgrammingEntry) => boolean;
  unfilledOnly: boolean;
  onNav: (delta: number) => void;
  onOpenDay: (iso: string) => void;
}) {
  const cells = monthGrid(year, month);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button type="button" className="btn-secondary" onClick={() => onNav(-1)} style={{ padding: "6px 12px" }}>
          ←
        </button>
        <strong style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem" }}>{formatMonthLabel(year, month)}</strong>
        <button type="button" className="btn-secondary" onClick={() => onNav(1)} style={{ padding: "6px 12px" }}>
          →
        </button>
      </div>
      <div className="cal-scroll">
      <div
        className="cal-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 1,
          background: "var(--color-line)",
          border: "1px solid var(--color-line)",
          borderRadius: "var(--r-card)",
          overflow: "hidden",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {WEEKDAY_LABELS.map((w, i) => (
          <div
            key={i}
            style={{ background: "var(--color-background)", padding: "10px 8px", textAlign: "center", fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.55 }}
          >
            {w}
          </div>
        ))}
        {cells.map((cell) => {
          const dayEntries = entriesByDate.get(cell.iso) ?? [];
          const hasEntries = dayEntries.length > 0;
          const dimDay = unfilledOnly && hasEntries;
          const visibleEntries = dayEntries.slice(0, 3);
          const overflow = dayEntries.length - visibleEntries.length;
          return (
            <div
              key={cell.iso}
              onClick={() => hasEntries && onOpenDay(cell.iso)}
              style={{
                background: "var(--color-surface)",
                minHeight: 100,
                padding: 8,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                cursor: hasEntries ? "pointer" : "default",
                opacity: dimDay ? 0.22 : cell.inMonth ? 1 : 0.4,
              }}
            >
              <div style={{ fontSize: "0.78rem", fontWeight: 600, opacity: 0.7 }}>{cell.date.getDate()}</div>
              {visibleEntries.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    fontSize: "0.67rem",
                    fontWeight: 600,
                    padding: "3px 7px",
                    borderRadius: 5,
                    color: "#fff",
                    background: fieldColor(entry.creativeField),
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    opacity: matches(entry) ? 1 : 0.16,
                  }}
                >
                  {entry.name.split(" ")[0]}
                </div>
              ))}
              {overflow > 0 && <div style={{ fontSize: "0.68rem", opacity: 0.55, fontWeight: 600 }}>+{overflow} more</div>}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

function WeekCalendar({
  weekStart,
  entriesByDate,
  matches,
  unfilledOnly,
  locationName,
  onNav,
  onOpenDay,
}: {
  weekStart: Date;
  entriesByDate: Map<string, ProgrammingEntry[]>;
  matches: (e: ProgrammingEntry) => boolean;
  unfilledOnly: boolean;
  locationName: (id: string | null) => string | null;
  onNav: (delta: number) => void;
  onOpenDay: (iso: string) => void;
}) {
  const cells = weekGrid(weekStart);
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button type="button" className="btn-secondary" onClick={() => onNav(-1)} style={{ padding: "6px 12px" }}>
          ←
        </button>
        <strong style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem" }}>{formatWeekRangeLabel(weekStart)}</strong>
        <button type="button" className="btn-secondary" onClick={() => onNav(1)} style={{ padding: "6px 12px" }}>
          →
        </button>
      </div>
      <div className="cal-scroll">
      <div
        className="week-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 1,
          background: "var(--color-line)",
          border: "1px solid var(--color-line)",
          borderRadius: "var(--r-card)",
          overflow: "hidden",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {cells.map((cell, i) => {
          const dayEntries = entriesByDate.get(cell.iso) ?? [];
          const hasEntries = dayEntries.length > 0;
          const dimDay = unfilledOnly && hasEntries;
          return (
            <div
              key={cell.iso}
              onClick={() => hasEntries && onOpenDay(cell.iso)}
              style={{
                background: "var(--color-surface)",
                minHeight: 220,
                padding: "12px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 7,
                cursor: hasEntries ? "pointer" : "default",
                opacity: dimDay ? 0.22 : 1,
              }}
            >
              <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.5 }}>{dayLabels[i]}</div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "1.1rem", color: "var(--color-ink-deep)" }}>{cell.date.getDate()}</div>
              {hasEntries ? (
                dayEntries.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      padding: "6px 8px",
                      borderRadius: 6,
                      color: "#fff",
                      lineHeight: 1.3,
                      background: fieldColor(entry.creativeField),
                      opacity: matches(entry) ? 1 : 0.16,
                    }}
                  >
                    {entry.name}
                    {locationName(entry.locationId) ? ` — ${locationName(entry.locationId)}` : ""}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: "0.74rem", opacity: 0.45, paddingTop: 6 }}>Nothing scheduled</div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

// "Unfilled only" is a calendar-day concept (dim days with nothing on
// them) that doesn't translate to a flat list, so List view doesn't take
// that filter — it always shows every dated entry, dimming only the
// location/field/service mismatches like the other views do.
function ListAgenda({
  entries,
  matches,
  locationName,
}: {
  entries: ProgrammingEntry[];
  matches: (e: ProgrammingEntry) => boolean;
  locationName: (id: string | null) => string | null;
}) {
  const dated = entries.filter((e): e is ProgrammingEntry & { date: string } => !!e.date);
  const byMonth = new Map<string, (ProgrammingEntry & { date: string })[]>();
  for (const entry of [...dated].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = entry.date.slice(0, 7);
    const list = byMonth.get(key) ?? [];
    list.push(entry);
    byMonth.set(key, list);
  }

  if (byMonth.size === 0) {
    return <p style={{ opacity: 0.65 }}>Nothing scheduled with a date yet.</p>;
  }

  return (
    <div>
      {Array.from(byMonth.entries()).map(([monthKey, monthEntries]) => {
        const [y, m] = monthKey.split("-").map(Number);
        return (
          <div key={monthKey} style={{ marginBottom: 30 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ width: 16, height: 2, background: "var(--brass)", display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--color-ink-deep)" }}>
                {new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long" })}
              </span>
              <span style={{ fontSize: "0.76rem", opacity: 0.5 }}>{monthEntries.length} acts</span>
            </div>
            <div className="card" style={{ padding: 0 }}>
              {monthEntries.map((entry, i) => (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "13px 18px",
                    borderTop: i === 0 ? "none" : "1px solid var(--color-line)",
                    opacity: matches(entry) ? 1 : 0.35,
                  }}
                >
                  <div style={{ width: 60, flexShrink: 0, fontSize: "0.78rem", fontWeight: 600, opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>
                    {formatShortDate(entry.date)}
                  </div>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: fieldColor(entry.creativeField), flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>{entry.name}</div>
                    <div style={{ fontSize: "0.8rem", opacity: 0.75 }}>
                      {entry.creativeService}
                      {locationName(entry.locationId) ? ` · ${locationName(entry.locationId)}` : ""}
                    </div>
                  </div>
                  <span className="pill">{entry.status}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
