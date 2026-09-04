// Real Creative Field -> Creative Service taxonomy, matching the live
// supplier-intake form (Basa Studio — Join Our Network,
// https://riyadh-winter-2026.netlify.app/supplier-intake.html) field for
// field, service for service, as of Sept 2026. On that form the service
// list is dependent on the field(s) checked — selecting "Photography"
// only reveals photography-related services, not the full catalog. The
// Creative Registry form (admin/CreativeRegistry.tsx) mirrors that: the
// service picker only shows services belonging to the fields currently
// checked, grouped under each field's name, instead of one flat list of
// everything.
export const CREATIVE_TAXONOMY: Record<string, string[]> = {
  "Music & Sound": [
    "Audio Branding & Jingles",
    "Choir Performance",
    "Custom Composition",
    "DJ Sets",
    "Live Music",
    "Podcast Production",
    "Songwriting",
    "Sound Design",
    "Sound Scenography & Installations",
    "Spoken Word Performance",
  ],
  "Shows & Entertainment": [
    "Acrobatics",
    "Aerial Performance",
    "Balloon Art",
    "Bubble Performance",
    "Burlesque Performance",
    "Choreography",
    "Clown Performance",
    "Close-up Magic",
    "Comedy Performance",
    "Contortion",
    "Costumed Characters & Walkabout Acts",
    "Cyr Wheel Performance",
    "Dance Performance",
    "Drag Performance",
    "Fire Performance",
    "Fortune Telling",
    "Hula Hoop Performance",
    "Juggling",
    "LED & Light Performance",
    "Living Statue Performance",
    "Magic & Illusion",
    "Mime Performance",
    "Parkour & Freerunning Performance",
    "Puppet & Object Theatre",
    "Sports Performance",
    "Stilt Walking",
    "Theatre Performance",
  ],
  "Space Design & Spatial Art": [
    "Anamorphic 3D Art",
    "Botanical & Floral Installations",
    "Ceiling Art",
    "Immersive Installations",
    "Inflatable Installations",
    "Landscape & Garden Art",
    "Light Installations",
    "Mural Design & Painting",
    "Paper & Origami Installations",
    "Prop Styling",
    "Public Art & Urban Interventions",
    "Set Design",
    "Site-Specific Installations",
    "Spatial Scenography",
    "Textile Installations",
    "Video Projections & Mapping",
    "Wall Sculptures & Reliefs",
    "Wayfinding & Artistic Signage",
    "Window Display Design",
  ],
  "Illustration, Graphic Design & Animation": [
    "3D Motion Design",
    "Book & Album Cover Design",
    "Botanical & Scientific Illustration",
    "Brand Identity & Logo Design",
    "Caricatures",
    "Character & Comic Design",
    "Concept Art & Storyboarding",
    "Editorial Design",
    "Graphic Design",
    "Illustration",
    "Information Design",
    "Motion Graphics & Animation",
    "Packaging Design",
    "Pattern Design",
    "Portrait Illustration",
    "Product Illustration & Design",
    "Stop Motion",
    "Typography & Lettering",
  ],
  "Digital, Immersive & Tech Art": [
    "AI Creative Production",
    "Augmented Reality (AR) Experiences",
    "CGI & 3D Visualization",
    "Creative Coding",
    "Drone Shows",
    "Game Design",
    "Holographic Experiences",
    "Interactive Installations",
    "NFT & Digital Collectibles",
    "Real-Time Visuals",
    "Screen-Based Digital Art",
    "Virtual Reality (VR) & Extended Reality (XR) Experiences",
  ],
  "Web, UX & UI Design": ["Design Systems", "Mobile App Design", "UI Design", "UX Design", "Web Design"],
  "Multi-Sensory Experiences": [
    "Culinary Experience Design",
    "Custom Fragrance Design",
    "Haptic & Tactile Installations",
    "Multi-Sensory Experience Design",
    "Scent Installations",
  ],
  "Live & Event Art": [
    "Graphic Recording & Sketchnoting",
    "Interactive Photo Experiences",
    "Live Calligraphy & Lettering",
    "Live Caricatures",
    "Live Chalk Art",
    "Live Face & Body Painting",
    "Live Illustration & Sketching",
    "Live Painting",
    "Live Portraits",
    "Live Product & Object Customization",
    "Live Sand Art",
    "Live Printmaking",
    "Temporary Tattoos",
  ],
  "Objects & Collectibles": ["Custom Object & Collectible Design", "Original Artwork", "Sculpture"],
  Photography: [
    "Architecture & Interior Photography",
    "Commercial & Advertising Photography",
    "Editorial & Documentary Photography",
    "Event Photography",
    "Fashion Photography",
    "Food Photography",
    "Photo Retouching & Post-Production",
    "Portrait Photography",
    "Product Photography",
    "Social media content photography",
    "Wedding Photography",
  ],
  Videography: [
    "Architecture & Space Videography",
    "Brand Films & Commercial Video",
    "Editorial & Documentary Filmmaking",
    "Event Videography",
    "Livestream Production",
    "Music Videos",
    "Product Video",
    "Social media content videography",
    "Video Editing & Post-Production",
    "Wedding Videography",
  ],
  "Writing & Storytelling": [
    "Copywriting",
    "Editorial Writing",
    "Ghostwriting",
    "Scriptwriting",
    "Speechwriting",
    "Storytelling & Narrative Development",
  ],
  "Hair, Make-up & Styling": [
    "Costume Design",
    "Hair Styling",
    "Make-up Artistry",
    "Prosthetics & Special Effects (SFX) Make-up",
    "Fashion & Wardrobe Styling",
  ],
  "Hosts, Moderators & Speakers": ["Event Hosting", "Moderation", "Public Speaking"],
  "Creative Direction & Consulting": ["Art Direction", "Creative Consulting", "Creative Direction", "Curation"],
  "Creative Workshops": [
    "Calligraphy & Lettering Workshops",
    "Ceramics & Pottery Workshops",
    "Circus & Movement Workshops",
    "Dance Workshops",
    "Digital Art & Illustration Workshops",
    "DJ Workshops",
    "Drawing & Painting Workshops",
    "Floral Design Workshops",
    "Fragrance Workshops",
    "Graffiti & Street Art Workshops",
    "Music Workshops",
    "Photography Workshops",
    "Printmaking Workshops",
    "Storytelling & Creative Writing Workshops",
    "Tape Art Workshops",
    "Theatre Workshops",
    "Videography Workshops",
  ],
};

export const CREATIVE_FIELDS = Object.keys(CREATIVE_TAXONOMY);
export const CREATIVE_SERVICES = Object.values(CREATIVE_TAXONOMY).flat();

// Services available for a given set of selected fields, grouped by
// field (in taxonomy order) — mirrors the real form's per-field reveal,
// extended to work when more than one field is checked at once.
export function servicesForFields(fields: string[]): { field: string; services: string[] }[] {
  return fields
    .filter((field) => CREATIVE_TAXONOMY[field])
    .map((field) => ({ field, services: CREATIVE_TAXONOMY[field] }));
}

// Which field a given service belongs to — used to color-match a
// service pill to its field wherever the two are shown apart (e.g. the
// registry list's flattened tag rows). Falls back to the service's own
// name if it isn't found (shouldn't happen for real taxonomy data).
const SERVICE_TO_FIELD: Record<string, string> = Object.fromEntries(
  Object.entries(CREATIVE_TAXONOMY).flatMap(([field, services]) => services.map((service) => [service, field])),
);
export function fieldForService(service: string): string | undefined {
  return SERVICE_TO_FIELD[service];
}

// One color per creative field, spread evenly around the hue wheel so
// all 16 are distinguishable — a field's chip and every one of its
// services share the same hue, so the two dimensions (which field? which
// service?) both read at a glance: field chips are solid/filled, service
// chips are the same hue at lower saturation with a hollow ring marker.
export function fieldHue(field: string): number {
  const idx = CREATIVE_FIELDS.indexOf(field);
  return idx === -1 ? 0 : Math.round((idx * 360) / CREATIVE_FIELDS.length);
}

export interface FieldAccent {
  hue: number;
  dot: string; // solid marker color (field-level)
  ring: string; // service-level marker color (lighter, same hue)
  fg: string; // text color on a tinted chip
  bgSelected: string; // tinted chip background when selected/present
  border: string;
}

export function fieldAccent(field: string): FieldAccent {
  const hue = fieldHue(field);
  return {
    hue,
    dot: `hsl(${hue} 62% 40%)`,
    ring: `hsl(${hue} 70% 62%)`,
    fg: `hsl(${hue} 55% 26%)`,
    bgSelected: `hsl(${hue} 62% 94%)`,
    border: `hsl(${hue} 45% 76%)`,
  };
}
