// Base theme — pulled live from marvelandjuicy.com (computed styles read
// directly from the site, not guessed). This is "ours"; a per-demo
// prospect logo + accent color layers on top via resolveTheme() below.
// Swapping in real Basa Studio / Book a Street Artist assets later is a
// change to this one file, not a rebuild — see theme.css for how these
// tokens get consumed.

import { resolveApiUrl } from "../api/client";

export interface Theme {
  colors: {
    background: string;
    surface: string;
    primary: string; // headings, primary buttons, main text on light surfaces
    footerBg: string; // darkest surface (footer, deep panels)
    pillBg: string; // tag/pill backgrounds
    onDark: string; // text on dark green surfaces
    onDarkMuted: string; // secondary text on dark green surfaces
    accent: string; // per-demo override target; defaults to primary
  };
  fonts: {
    heading: string;
    body: string;
  };
  logoUrl: string;
  companyDisplayName: string;
}

export const baseTheme: Theme = {
  colors: {
    background: "#F4F1E8",
    surface: "#FFFFFF",
    primary: "#2C4741",
    footerBg: "#233530",
    pillBg: "#ECE6D5",
    onDark: "#DFE6E2",
    onDarkMuted: "#A9BEB6",
    accent: "#2C4741", // no per-demo override yet -> same as primary
  },
  fonts: {
    heading: "'Fraunces', serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  // Placeholder mark until Mario uploads the real Basa Studio / Book a
  // Street Artist logo assets — swap this file, nothing else changes.
  logoUrl: "/assets/base/lamha-mark.svg",
  companyDisplayName: "Lamha",
};

export interface DemoOverride {
  logoUrl?: string | null;
  accentColor?: string | null;
  companyDisplayName?: string;
}

// Merges the base theme with a per-demo prospect override. Any non-null
// override field wins; everything else falls back to base. Admin app
// never calls this with an override — it always renders baseTheme as-is.
export function resolveTheme(base: Theme, override?: DemoOverride | null): Theme {
  if (!override) return base;
  return {
    ...base,
    colors: {
      ...base.colors,
      accent: override.accentColor || base.colors.accent,
    },
    logoUrl: resolveApiUrl(override.logoUrl) || base.logoUrl,
    companyDisplayName: override.companyDisplayName || base.companyDisplayName,
  };
}
