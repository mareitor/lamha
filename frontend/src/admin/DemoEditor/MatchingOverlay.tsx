import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

// Full-screen "Lamha is on it" takeover shown while AI matching is in
// flight (MatchesTab.tsx). This is an admin-only, internal tool, but
// Mario asked for it to feel a little spectacular rather than a bare
// spinner — a converging-dots motif (styles in theme.css) plus staged
// status copy that cycles while the request is out. Purely decorative:
// the phrases don't reflect real request stages, since the actual API
// call is one round trip.
const PHRASES = [
  "Reading the event brief…",
  "Scanning your creative network…",
  "Weighing fields, services & fit…",
  "Ranking the strongest matches…",
];

const DOT_COUNT = 8;

export function MatchingOverlay({ leaving }: { leaving?: boolean }) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % PHRASES.length);
    }, 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`matching-overlay${leaving ? " leaving" : ""}`} role="status" aria-live="polite">
      <div style={{ textAlign: "center", maxWidth: 380, padding: "0 24px" }}>
        <div className="matching-dots">
          {Array.from({ length: DOT_COUNT }, (_, i) => (
            <span
              key={i}
              className="dot"
              style={
                {
                  "--angle": `${(360 / DOT_COUNT) * i}deg`,
                  "--delay": `${i * 0.18}s`,
                } as CSSProperties
              }
            />
          ))}
          <span className="core" />
        </div>

        <strong
          style={{
            display: "block",
            fontFamily: "var(--font-heading)",
            fontSize: "1.7rem",
            marginBottom: 10,
            color: "var(--color-on-dark)",
          }}
        >
          Lamha is on it
        </strong>

        <p
          key={phraseIndex}
          className="matching-phrase"
          style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-on-dark-muted)" }}
        >
          {PHRASES[phraseIndex]}
        </p>
      </div>
    </div>
  );
}
