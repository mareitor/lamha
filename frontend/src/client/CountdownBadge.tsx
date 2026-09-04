import { useCountdown } from "../hooks/useCountdown";

export function CountdownBadge({ expiresAt }: { expiresAt: number }) {
  const parts = useCountdown(expiresAt);
  if (!parts || parts.expired) return null;

  return (
    <div
      className="countdown-badge"
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        maxWidth: "calc(100vw - 32px)",
        zIndex: 50,
        background: "linear-gradient(180deg, var(--color-footer-bg) 0%, var(--color-footer-bg-2) 100%)",
        color: "var(--color-on-dark)",
        padding: "9px 16px 8px",
        borderRadius: "var(--radius-sm)",
        borderTop: "2px solid var(--brass)",
        fontSize: "0.76rem",
        fontWeight: 500,
        fontVariantNumeric: "tabular-nums",
        boxShadow: "var(--shadow-lift)",
      }}
    >
      Demo expiring in {parts.days} days : {String(parts.hours).padStart(2, "0")} hrs : {String(parts.minutes).padStart(2, "0")} mins
    </div>
  );
}
