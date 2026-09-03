import { useState } from "react";
import * as demoApi from "../../api/demoApi";
import type { DemoMode, DemoRecord } from "../../types";

export function ModeToggle({ demo, onUpdated }: { demo: DemoRecord; onUpdated: (demo: DemoRecord) => void }) {
  const [saving, setSaving] = useState(false);

  async function toggle(mode: DemoMode) {
    if (mode === demo.mode || saving) return;
    setSaving(true);
    try {
      onUpdated(await demoApi.setMode(demo.id, mode));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card dark-panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div>
        <strong>{demo.mode === "self-service" ? "You're in self-service mode" : "We're managing this for you"}</strong>
        <p className="muted" style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
          {demo.mode === "self-service"
            ? "You can edit your own artists, programming, and budget below."
            : "Our team runs your programming and budget. Switch anytime if you'd rather do it yourself."}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className={demo.mode === "managed" ? "" : "btn-secondary"}
          onClick={() => toggle("managed")}
          disabled={saving}
          style={demo.mode !== "managed" ? { borderColor: "var(--color-on-dark)", color: "var(--color-on-dark)" } : undefined}
        >
          Fully managed
        </button>
        <button
          className={demo.mode === "self-service" ? "" : "btn-secondary"}
          onClick={() => toggle("self-service")}
          disabled={saving}
          style={demo.mode !== "self-service" ? { borderColor: "var(--color-on-dark)", color: "var(--color-on-dark)" } : undefined}
        >
          Self-service
        </button>
      </div>
    </div>
  );
}
