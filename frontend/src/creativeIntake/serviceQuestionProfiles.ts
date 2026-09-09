// Light-touch per-service question tailoring (Mario, Sept 9, round 2:
// "Typography & Lettering should have different questions than Live
// Calligraphy & Lettering and Live painting"). Deliberately NOT a
// bespoke question set per each of the ~150 taxonomy services — that's
// the bigger "field-specific hard facts" lift already flagged as a later
// phase in the build-status doc. Instead: keep the same 4 hard facts,
// but (a) skip the outdoor-capable question for services that aren't a
// physical, on-site appearance, and (b) word the budget/lead-time
// questions around "a booking" vs "a project" so they read naturally
// either way. Heuristic, not a hand-curated table for every service —
// good enough to fix the worst mismatches (a graphic designer being
// asked if they're outdoor-capable) without a large new data file.

const PHYSICAL_FIELDS = new Set([
  "Shows & Entertainment",
  "Creative Workshops",
  "Hosts, Moderators & Speakers",
  "Space Design & Spatial Art",
  "Hair, Make-up & Styling",
  "Multi-Sensory Experiences",
]);

const DESK_FIELDS = new Set([
  "Illustration, Graphic Design & Animation",
  "Web, UX & UI Design",
  "Writing & Storytelling",
  "Creative Direction & Consulting",
  "Objects & Collectibles",
]);

// Substrings checked against the lowercased service name — these win
// over the field-level defaults above (e.g. "Photo Retouching &
// Post-Production" is desk work even though Photography as a field
// otherwise reads as on-site).
const DESK_KEYWORDS = [
  "retouching",
  "post-production",
  "editing",
  "podcast production",
  "sound design",
  "custom composition",
  "songwriting",
  "audio branding",
  "sound scenography",
];

export interface ServiceQuestionProfile {
  /** Whether this service is a physical, on-site appearance/installation
   * — decides whether to ask the outdoor-capable question at all, and
   * which way the budget/lead-time copy leans. */
  physical: boolean;
}

export function getServiceQuestionProfile(serviceName: string, creativeField: string): ServiceQuestionProfile {
  const lower = serviceName.toLowerCase();

  if (DESK_KEYWORDS.some((k) => lower.includes(k))) return { physical: false };
  if (lower.startsWith("live ")) return { physical: true };
  if (lower.includes("photography") || lower.includes("videography")) return { physical: true };
  if (PHYSICAL_FIELDS.has(creativeField)) return { physical: true };
  if (DESK_FIELDS.has(creativeField)) return { physical: false };

  if (creativeField === "Music & Sound") {
    return { physical: /\b(dj sets|live music|choir performance|spoken word performance)\b/.test(lower) };
  }
  if (creativeField === "Digital, Immersive & Tech Art") {
    return { physical: /\b(drone shows|holographic experiences|interactive installations)\b/.test(lower) };
  }

  // Default: Lamha's context is almost entirely live events, so assume a
  // physical appearance rather than silently hiding a relevant question.
  return { physical: true };
}

export function budgetQuestionCopy(serviceName: string, physical: boolean): string {
  return physical
    ? `What's your usual minimum budget when you're booked for ${serviceName}?`
    : `What's your usual minimum budget for a ${serviceName} project?`;
}

export function leadTimeQuestionCopy(physical: boolean): string {
  return physical
    ? "How much advance notice do you usually need before a booking?"
    : "How much lead time do you usually need to start on a new project?";
}

export function outdoorQuestionCopy(serviceName: string): string {
  return `Comfortable working outdoors for ${serviceName}?`;
}
