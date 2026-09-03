import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";
import { createDemo } from "../api/adminApi";
import { extractDominantColor } from "./extractDominantColor";
import { AdminLayout } from "./AdminLayout";

export function NewDemoForm() {
  const { password } = useAdminAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ demoId: string; shareUrl: string; warning?: string } | null>(
    null,
  );

  async function handleLogoChange(file: File | null) {
    setLogo(file);
    setAccentColor(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    if (!file) {
      setLogoPreview(null);
      return;
    }
    setLogoPreview(URL.createObjectURL(file));
    setExtracting(true);
    const color = await extractDominantColor(file);
    setAccentColor(color);
    setExtracting(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password || !companyName.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await createDemo(password, { companyName: companyName.trim(), logo, accentColor });
      setResult({ demoId: res.demo.id, shareUrl: res.shareUrl, warning: res.warning });
    } catch {
      setError("Couldn't create the demo — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const fullUrl = `${window.location.origin}${result.shareUrl}`;
    return (
      <AdminLayout>
        <div className="card" style={{ maxWidth: 520 }}>
          <h2>Demo created</h2>
          {result.warning && <p style={{ color: "#B08D2B" }}>{result.warning}</p>}
          <label>Shareable link</label>
          <input readOnly value={fullUrl} onFocus={(e) => e.currentTarget.select()} />
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(fullUrl).catch(() => {})}
            >
              Copy link
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate(`/admin/demos/${result.demoId}`)}
            >
              Open editor
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={{ maxWidth: 480 }}>
        <h1>New demo</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="companyName">Company name</label>
          <input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Corp"
            autoFocus
          />

          <div style={{ marginTop: 16 }}>
            <label htmlFor="logo">Logo (optional — can add later)</label>
            <input
              id="logo"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={(e) => handleLogoChange(e.target.files?.[0] ?? null)}
            />
          </div>

          {logoPreview && (
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
              <img
                src={logoPreview}
                alt="Logo preview"
                style={{ maxWidth: 120, maxHeight: 60, objectFit: "contain", background: "#fff", padding: 8 }}
              />
              <div>
                <label style={{ marginBottom: 4 }}>Accent color</label>
                {extracting ? (
                  <span className="pill">Detecting…</span>
                ) : accentColor ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: accentColor,
                        display: "inline-block",
                        border: "1px solid var(--color-pill-bg)",
                      }}
                    />
                    <code>{accentColor}</code>
                  </div>
                ) : (
                  <span className="pill">Couldn't detect — set later</span>
                )}
              </div>
            </div>
          )}

          {error && <p style={{ color: "#B23A48", marginTop: 12 }}>{error}</p>}

          <button type="submit" disabled={submitting || !companyName.trim()} style={{ marginTop: 24 }}>
            {submitting ? "Generating…" : "Generate"}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}
