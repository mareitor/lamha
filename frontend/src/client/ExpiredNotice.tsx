// Exact copy as specified — no button, clean and simple. This is the
// ONLY thing rendered once a demo hits zero; DemoShell unmounts
// everything else in the tree when this shows.
export function ExpiredNotice() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 24,
        background: "var(--color-background)",
      }}
    >
      <p style={{ maxWidth: 480, fontSize: "1.15rem", fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}>
        This demo has expired. Loved what you saw? Reach out to Hoang —{" "}
        <a href="mailto:hoang@marvelandjuicy.com">hoang@marvelandjuicy.com</a> — and we'll get you set
        up properly.
      </p>
    </div>
  );
}
