import { createContext, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { baseTheme, resolveTheme, type DemoOverride, type Theme } from "./baseTheme";

const ThemeContext = createContext<Theme>(baseTheme);

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  override?: DemoOverride | null;
  children: ReactNode;
}

// Resolves base + per-demo override into a Theme, writes it onto
// document.documentElement as CSS custom properties, and provides it via
// context for components that need the raw values (e.g. <img src>).
// Every themed component should prefer var(--color-*) / var(--font-*) in
// CSS over reading the context directly, so re-theming per demo needs
// zero per-component logic.
export function ThemeProvider({ override, children }: ThemeProviderProps) {
  const theme = useMemo(() => resolveTheme(baseTheme, override), [override]);

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--color-background", theme.colors.background);
    root.setProperty("--color-surface", theme.colors.surface);
    root.setProperty("--color-primary", theme.colors.primary);
    root.setProperty("--color-footer-bg", theme.colors.footerBg);
    root.setProperty("--color-pill-bg", theme.colors.pillBg);
    root.setProperty("--color-on-dark", theme.colors.onDark);
    root.setProperty("--color-on-dark-muted", theme.colors.onDarkMuted);
    root.setProperty("--color-accent", theme.colors.accent);
    root.setProperty("--font-heading", theme.fonts.heading);
    root.setProperty("--font-body", theme.fonts.body);
  }, [theme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
