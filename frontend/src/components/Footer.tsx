// Present on every demo (client and admin views) per spec. "Lamha" is
// hardcoded here rather than pulled from theme — the attribution is
// about this tool, not the per-demo prospect branding.
export function Footer() {
  return (
    <footer className="dark-panel" style={{ padding: "20px 24px", marginTop: 40 }}>
      <div className="container" style={{ fontSize: "0.78rem" }}>
        <span className="muted">
          Lamha is a product by{" "}
          <a href="https://basa-studio.com" target="_blank" rel="noreferrer" style={{ color: "var(--color-on-dark)" }}>
            Basa Studio
          </a>{" "}
          and{" "}
          <a
            href="https://bookastreetartist.com"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--color-on-dark)" }}
          >
            Book a Street Artist
          </a>
          .
        </span>
      </div>
    </footer>
  );
}
