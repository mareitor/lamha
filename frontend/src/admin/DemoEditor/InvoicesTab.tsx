import { useState } from "react";
import * as adminApi from "../../api/adminApi";
import type { DemoRecord, InvoiceStatus } from "../../types";

interface Props {
  demo: DemoRecord;
  password: string;
  onSaved: (demo: DemoRecord) => void;
}

const STATUS_OPTIONS: InvoiceStatus[] = ["draft", "sent", "paid", "overdue"];

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: "#A9BEB6",
  sent: "#2C6E8F",
  paid: "#4A7C59",
  overdue: "#B23A48",
};

export function InvoicesTab({ demo, password, onSaved }: Props) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!label.trim() || !amount) return;
    setAdding(true);
    try {
      const updated = await adminApi.addInvoice(password, demo.id, {
        label: label.trim(),
        amount: Number(amount),
        currency: demo.budget.currency,
        dueDate,
        status: "draft",
      });
      onSaved(updated);
      setLabel("");
      setAmount("");
      setDueDate("");
    } finally {
      setAdding(false);
    }
  }

  async function updateStatus(itemId: string, status: InvoiceStatus) {
    onSaved(await adminApi.updateInvoice(password, demo.id, itemId, { status }));
  }

  async function remove(itemId: string) {
    onSaved(await adminApi.deleteInvoice(password, demo.id, itemId));
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>New invoice</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label>Label</label>
            <input placeholder="e.g. Deposit — Artist Roster A" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div style={{ width: 140 }}>
            <label>Amount</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div style={{ width: 160 }}>
            <label>Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <button onClick={handleAdd} disabled={adding || !label.trim() || !amount}>
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      </div>

      {demo.invoices.length === 0 ? (
        <p>No invoices yet.</p>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "var(--color-background)" }}>
                <th style={{ padding: 12 }}>Label</th>
                <th style={{ padding: 12 }}>Amount</th>
                <th style={{ padding: 12 }}>Due</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}></th>
              </tr>
            </thead>
            <tbody>
              {demo.invoices.map((inv) => (
                <tr key={inv.id} style={{ borderTop: "1px solid var(--color-pill-bg)" }}>
                  <td style={{ padding: 12 }}>{inv.label}</td>
                  <td style={{ padding: 12 }}>
                    {inv.amount.toLocaleString()} {inv.currency}
                  </td>
                  <td style={{ padding: 12 }}>{inv.dueDate || "—"}</td>
                  <td style={{ padding: 12 }}>
                    <select
                      value={inv.status}
                      onChange={(e) => updateStatus(inv.id, e.target.value as InvoiceStatus)}
                      style={{ color: STATUS_COLORS[inv.status], fontWeight: 600 }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: 12, textAlign: "right" }}>
                    <button className="btn-secondary" onClick={() => remove(inv.id)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
