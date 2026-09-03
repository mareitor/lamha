import { useState } from "react";
import * as demoApi from "../../api/demoApi";
import type { DemoRecord } from "../../types";

export function BudgetSection({
  demo,
  onUpdated,
}: {
  demo: DemoRecord;
  onUpdated: (demo: DemoRecord) => void;
}) {
  const editable = demo.mode === "self-service";
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(demo.budget.totalBudget ?? 0);
  const [saving, setSaving] = useState(false);

  const spent = demo.programming
    .filter((p) => p.status !== "cancelled")
    .reduce((sum, p) => sum + p.priceQuoted, 0);

  async function save() {
    setSaving(true);
    try {
      onUpdated(await demoApi.updateBudget(demo.id, { totalBudget: value }));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  const total = demo.budget.totalBudget;
  const pctUsed = total && total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : null;

  return (
    <section style={{ marginTop: 40 }}>
      <h2>Budget</h2>
      <div className="card">
        {editing ? (
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div>
              <label>Total budget ({demo.budget.currency})</label>
              <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} />
            </div>
            <button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button className="btn-secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.85rem", opacity: 0.75 }}>Programmed so far</div>
              <strong style={{ fontSize: "1.3rem" }}>
                {spent.toLocaleString()} {demo.budget.currency}
                {total ? ` / ${total.toLocaleString()}` : ""}
              </strong>
              {pctUsed !== null && (
                <div style={{ marginTop: 8, height: 6, background: "var(--color-pill-bg)", borderRadius: 3, maxWidth: 280 }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${pctUsed}%`,
                      background: "var(--color-accent)",
                      borderRadius: 3,
                    }}
                  />
                </div>
              )}
            </div>
            {editable && (
              <button className="btn-secondary" onClick={() => setEditing(true)}>
                Set budget
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
