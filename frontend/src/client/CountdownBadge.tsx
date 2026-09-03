import { useCountdown } from "../hooks/useCountdown";

export function CountdownBadge({ expiresAt }: { expiresAt: number }) {
  const parts = useCountdown(expiresAt);
  if (!parts || parts.expired) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 50,
        background: "var(--color-footer-bg)",
        color: "var(--color-on-dark)",
        padding: "8px 14px",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.78rem",
        fontWeight: 500,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      Demo expiring in {parts.days} days : {String(parts.hours).padStart(2, "0")} hrs : {String(parts.minutes).padStart(2, "0")} mins
    </div>
  );
}
