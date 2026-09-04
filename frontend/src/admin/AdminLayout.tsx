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
  return (
    <ThemeProvider>
    <div>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          borderBottom: "1px solid var(--color-pill-bg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link to="/admin" style={{ textDecoration: "none" }}>
            <strong style={{ fontFamily: "var(--font-heading)", fontSize: "1.3rem" }}>
              Lamha Admin
            </strong>
          </Link>
          <Link to="/admin" style={{ fontSize: "0.85rem" }}>
            Demos
          </Link>
          <Link to="/admin/creatives" style={{ fontSize: "0.85rem" }}>
            Creative Registry
          </Link>
        </div>
        <button
          className="btn-secondary"
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
