import type { InvoiceStatus } from "../../types";

const STYLES: Record<InvoiceStatus, { bg: string; fg: string }> = {
  draft: { bg: "#ECE6D5", fg: "#2C4741" },
  sent: { bg: "#DCE8F0", fg: "#2C6E8F" },
  paid: { bg: "#DFEFE2", fg: "#3E7A4F" },
  overdue: { bg: "#F4DCDF", fg: "#B23A48" },
};

export function InvoiceStatusPill({ status }: { status: InvoiceStatus }) {
  const s = STYLES[status];
  return (
    <span
      className="pill"
      style={{ background: s.bg, color: s.fg }}
    >
      {status}
    </span>
  );
}
