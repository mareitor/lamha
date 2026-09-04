import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";
import { Footer } from "../components/Footer";
import { ThemeProvider } from "../theme/ThemeProvider";

export function AdminLayout({ children }: { children: ReactNode }) {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();

  // No override -> always resolves to baseTheme. This also RESETS the
  // document-level CSS variables a client demo page may have set (they
  // write onto document.documentElement, which persists across
  // client-side route changes) — without this, navigating from a themed
  // demo to the admin panel in the same tab would leak that demo's
  // accent color into the admin UI. Admin should always look like "us."
  //
  // The header (and Footer, below) use .dark-panel — the same dark
  // green/brass-rule surface a client only ever sees at the very bottom
  // of their page. Framing the whole admin console between two dark bars
  // (client pages only ever have one, at the foot) is a deliberate,
  // on-brand tell: at a glance, "dark top bar" = admin, never a client
  // view (Mario, Sept 2026 — admin and client looked identically
  // branded before this, which he found disorienting to work in).
  return (
    <ThemeProvider>
    <div>
      <header
        className="dark-panel"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link to="/admin" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <strong style={{ fontFamily: "var(--font-heading)", fontSize: "1.3rem", color: "var(--color-on-dark)" }}>
              Lamha
            </strong>
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "var(--color-footer-bg)",
                background: "var(--brass)",
                borderRadius: "var(--radius-pill)",
                padding: "2px 8px",
              }}
            >
              Admin
            </span>
          </Link>
          <Link to="/admin" style={{ fontSize: "0.85rem", color: "var(--color-on-dark-muted)" }}>
            Demos
          </Link>
          <Link to="/admin/creatives" style={{ fontSize: "0.85rem", color: "var(--color-on-dark-muted)" }}>
            Creative Registry
          </Link>
        </div>
        <button
          className="btn-secondary"
          style={{ borderColor: "var(--color-on-dark-muted)", color: "var(--color-on-dark)" }}
          onClick={() => {
            logout();
            navigate("/admin/login");
          }}
        >
          Log out
        </button>
      </header>
      <main className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
        {children}
      </main>
      <Footer />
    </div>
    </ThemeProvider>
  );
}
