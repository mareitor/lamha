import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "./AdminAuthContext";
import { listDemos, resyncIndex } from "../api/adminApi";
import type { DemoIndexEntry } from "../types";
import { AdminLayout } from "./AdminLayout";

function formatExpiry(expiresAt: number): string {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return "expired";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  return `${days}d left`;
}

export function AdminDashboard() {
  const { password } = useAdminAuth();
  const [demos, setDemos] = useState<DemoIndexEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resyncing, setResyncing] = useState(false);

  const load = useCallback(async () => {
    if (!password) return;
    try {
      const { demos } = await listDemos(password);
      setDemos(demos);
    } catch {
      setError("Couldn't load demos.");
    }
  }, [password]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleResync() {
    if (!password) return;
    setResyncing(true);
    try {
      const { demos } = await resyncIndex(password);
      setDemos(demos);
    } finally {
      setResyncing(false);
    }
  }

  return (
    <AdminLayout>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Demos</h1>
        <Link to="/admin/demos/new">
          <button>+ New Demo</button>
        </Link>
      </div>

      {error && <p style={{ color: "#B23A48" }}>{error}</p>}

      {demos === null && !error && <p>Loading…</p>}

      {demos && demos.length === 0 && (
        <p>No demos yet — create one to get a shareable link.</p>
      )}

      {demos && demos.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "var(--color-background)" }}>
                <th style={{ padding: 12 }}>Company</th>
                <th style={{ padding: 12 }}>Mode</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Expires</th>
                <th style={{ padding: 12 }}></th>
              </tr>
            </thead>
            <tbody>
              {demos.map((demo) => (
                <tr key={demo.id} style={{ borderTop: "1px solid var(--color-pill-bg)" }}>
                  <td style={{ padding: 12 }}>{demo.companyName}</td>
                  <td style={{ padding: 12 }}>
                    <span className="pill">{demo.mode === "self-service" ? "Self-service" : "Managed"}</span>
                  </td>
                  <td style={{ padding: 12 }}>{demo.status}</td>
                  <td style={{ padding: 12 }}>{formatExpiry(demo.expiresAt)}</td>
                  <td style={{ padding: 12, textAlign: "right" }}>
                    <Link to={`/admin/demos/${demo.id}`}>Edit →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        className="btn-secondary"
        onClick={handleResync}
        disabled={resyncing}
        style={{ marginTop: 24, fontSize: "0.8rem" }}
      >
        {resyncing ? "Resyncing…" : "Resync list (repair)"}
      </button>
    </AdminLayout>
  );
}
