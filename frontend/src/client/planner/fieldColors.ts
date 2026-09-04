// NOTE: this is the *fictional demo roster's* 4-category system
// (creativeRoster.json — Visual Arts / Digital & Light / Performance /
// Installation), used only for the client-facing planner calendar's
// legend/dots. It is intentionally separate from CREATIVE_TAXONOMY in
// data/creativeTaxonomy.ts, which is the real 16-field/service taxonomy
// for the admin Creative Registry (real suppliers) — the two are
// different systems that happen to share the word "creative field", and
// must not be merged again.
export const CREATIVE_FIELDS = ["Visual Arts", "Digital & Light", "Performance", "Installation"];

// Maps a roster creative field to its calendar/legend color token
// (theme.css --field-*). Falls back to the primary color for anything
// outside these four, so a future roster addition never renders with a
// missing/invisible color.
const FIELD_COLOR_VARS: Record<string, string> = {
  "Visual Arts": "var(--field-visual-arts)",
  "Digital & Light": "var(--field-digital-light)",
  Performance: "var(--field-performance)",
  Installation: "var(--field-installation)",
};

export function fieldColor(field: string): string {
  return FIELD_COLOR_VARS[field] ?? "var(--color-primary)";
}
