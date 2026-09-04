import { CREATIVE_FIELDS } from "../../data/creativeTaxonomy";

// Maps a creative field to its calendar/legend color token (theme.css
// --field-*). Falls back to the primary color for anything outside the
// four fields the roster currently uses, so a future roster addition
// never renders with a missing/invisible color.
const FIELD_COLOR_VARS: Record<string, string> = {
  "Visual Arts": "var(--field-visual-arts)",
  "Digital & Light": "var(--field-digital-light)",
  Performance: "var(--field-performance)",
  Installation: "var(--field-installation)",
};

export function fieldColor(field: string): string {
  return FIELD_COLOR_VARS[field] ?? "var(--color-primary)";
}

export { CREATIVE_FIELDS };
