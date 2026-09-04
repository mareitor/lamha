// Small local-date helpers for the Season Agenda calendar. Deliberately
// not using Date -> toISOString() for day keys — that converts through
// UTC and can silently roll a local midnight onto the wrong day for
// anyone west/east of UTC. Everything here stays in local calendar time,
// matching how ProgrammingEntry.date ("YYYY-MM-DD") is entered and read.

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export interface MonthCell {
  date: Date;
  iso: string;
  inMonth: boolean;
}

// Sunday-start 6-week (42-cell) grid for the given month, including the
// trailing/leading days from adjacent months (rendered dimmed).
export function monthGrid(year: number, month: number): MonthCell[] {
  const first = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - first.getDay());
  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push({ date: d, iso: toISODate(d), inMonth: d.getMonth() === month });
  }
  return cells;
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface WeekCell {
  date: Date;
  iso: string;
}

export function weekGrid(weekStart: Date): WeekCell[] {
  const out: WeekCell[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    out.push({ date: d, iso: toISODate(d) });
  }
  return out;
}

export function addDays(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

export function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const startLabel = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" });
  return `${startLabel} – ${endLabel}, ${end.getFullYear()}`;
}

export function formatDayLabel(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function formatShortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
