import type { DemoRecord } from "../../types";
import { InvoiceStatusPill } from "../shared/InvoiceStatusPill";

// Read-only in both modes — invoicing stays with "our team" even for
// self-service clients (plan doc's flagged assumption). No client-facing
// write path exists for invoices by design.
export function InvoicesSection({ demo }: { demo: DemoRecord }) {
  return (
    <section style={{ marginTop: 40, marginBottom: 40 }}>
      <h2>Invoices</h2>
      {demo.invoices.length === 0 ? (
        <p style={{ opacity: 0.75 }}>No invoices yet.</p>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "var(--color-background)" }}>
                <th style={{ padding: 12 }}>Label</th>
                <th style={{ padding: 12 }}>Amount</th>
                <th style={{ padding: 12 }}>Due</th>
                <th style={{ padding: 12 }}>Status</th>
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
                    <InvoiceStatusPill status={inv.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
