// Single source of truth for the Creative Field / Creative Service
// checklists — mirrors the options on the real supplier-intake form
// (see Creative Registry). Used by the registry's add/edit form for its
// checkboxes, and by the Planner's field-color legend (fieldColors.ts
// re-exports CREATIVE_FIELDS from here rather than declaring its own).
export const CREATIVE_TAXONOMY: Record<string, string[]> = {
  "Visual Arts": ["Muralism", "Live Painting", "Calligraphy", "Sculpture"],
  "Digital & Light": ["Light Art", "Projection Mapping"],
  Performance: ["Performance Art"],
  Installation: ["Installation Art"],
};

export const CREATIVE_FIELDS = Object.keys(CREATIVE_TAXONOMY);
export const CREATIVE_SERVICES = Object.values(CREATIVE_TAXONOMY).flat();
