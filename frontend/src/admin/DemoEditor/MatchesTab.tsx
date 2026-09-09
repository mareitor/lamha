import { useState } from "react";
import * as adminApi from "../../api/adminApi";
import { ApiError } from "../../api/client";
import type { CreativeMatch, DemoRecord } from "../../types";
import { MatchingOverlay } from "./MatchingOverlay";

// Keep the "Lamha is on it" overlay up at least this long even when the
// API responds fast, so it never flashes past before it can read — the
// overlay exists for feel, not to mask real latency. The 350ms below
// matches the CSS fade-out duration in theme.css (.matching-overlay.leaving).
const MIN_OVERLAY_MS = 2200;
const OVERLAY_FADE_MS = 350;

// AI matching against the real Creative Registry — Mario's own sourcing
// tool for finding suppliers to actually contact and book for this
// demo's event. Deliberately NOT wired to write anything back onto the
// demo: a demo's own Programming/Season Agenda stays 100% fictional
// (locked decision from the original plan), so this tab only ever reads
// the registry and shows results here, admin-only, never shown to a
// client.

function withProtocol(url: string): string {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function fitLabel(score: number): { text: string; color: string } {
  if (score >= 75) return { text: "Strong fit", color: "var(--paid)" };
  if (score >= 45) return { text: "Possible fit", color: "var(--brass)" };
  return { text: "Weak fit", color: "var(--overdue)" };
}

interface Props {
  demo: DemoRecord;
  password: string;
}

export function MatchesTab({ demo, password }: Props) {
  const [matches, setMatches] = useState<CreativeMatch[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayLeaving, setOverlayLeaving] = useState(false);

  const hasBrief = !!(demo.event.eventName || demo.event.eventType || demo.event.description || demo.event.notes);

  async function run() {
    setLoading(true);
    setError(null);
    setShowOverlay(true);
    setOverlayLeaving(false);
    const startedAt = Date.now();

    async function waitOutMinimum() {
      const remaining = MIN_OVERLAY_MS - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    }

    try {
      const { matches } = await adminApi.matchCreatives(password, demo.id);
      await waitOutMinimum();
      setMatches(matches);
    } catch (err) {
      await waitOutMinimum();
      setError(err instanceof ApiError ? err.message : "Couldn't run matching — try again.");
    } finally {
      setLoading(false);
      setOverlayLeaving(true);
      setTimeout(() => setShowOverlay(false), OVERLAY_FADE_MS);
    }
  }

  return (
    <div>
      {showOverlay && <MatchingOverlay leaving={overlayLeaving} />}

      <div className="card" style={{ marginBottom: 24, maxWidth: 640 }}>
        <h3 style={{ marginTop: 0 }}>AI creative matching</h3>
        <p style={{ fontSize: "0.85rem", opacity: 0.75 }}>
          Reads this demo's Event brief and shortlists the best-fitting <strong>Active</strong> creatives from your
          real Creative Registry, with contact info so you can reach out directly. This is a sourcing tool for
          you — nothing here is ever shown to the client or written into this demo's Season Agenda, which stays
          the standard fictional lineup.
        </p>

        {!hasBrief ? (
          <p style={{ fontSize: "0.85rem", color: "var(--overdue)" }}>
            This demo's Event tab doesn't have a name, type, or description yet — fill in at least one of those
            first so there's something to match against.
          </p>
        ) : (
          <div style={{ fontSize: "0.82rem", opacity: 0.7, marginBottom: 16 }}>
            <label style={{ marginBottom: 4 }}>Matching against</label>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              {[demo.event.eventName, demo.event.eventType, demo.event.description, demo.event.notes]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        )}

        <button onClick={run} disabled={loading || !hasBrief}>
          {loading ? "Matching…" : matches ? "Run again" : "Find matching creatives"}
        </button>

        {error && (
          <p style={{ color: "#B23A48", marginTop: 12, fontSize: "0.85rem" }}>
            {error}
            {error.toLowerCase().includes("api key") && (
              <>
                {" "}
                Get one at{" "}
                <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
                  console.anthropic.com
                </a>
                .
              </>
            )}
          </p>
        )}
      </div>

      {matches && matches.length === 0 && !error && (
        <p style={{ opacity: 0.7 }}>No good fits found in the current Active registry for this brief.</p>
      )}

      {matches && matches.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {matches.map((m) => {
            const fit = fitLabel(m.fitScore);
            const waDigits =
              m.whatsappForBusiness && m.phone ? `${m.phoneCountryCode}${m.phone}`.replace(/\D/g, "") : null;
            return (
              <div key={`${m.creativeId}-${m.serviceId}`} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <strong>{m.displayName}</strong>
                    <div style={{ fontSize: "0.8rem", opacity: 0.7, marginTop: 2 }}>
                      {m.creativeField}
                      {m.serviceName ? ` — ${m.serviceName}` : ""}
                    </div>
                  </div>
                  <span
                    className="pill"
                    style={{ background: "transparent", border: `1px solid ${fit.color}`, color: fit.color, flexShrink: 0 }}
                  >
                    {fit.text} · {m.fitScore}
                  </span>
                </div>

                <p style={{ margin: "10px 0 0", fontSize: "0.85rem", fontStyle: "italic", opacity: 0.85 }}>
                  “{m.reason}”
                </p>

                {m.workDescription && (
                  <p style={{ margin: "8px 0 0", fontSize: "0.83rem", opacity: 0.75 }}>{m.workDescription}</p>
                )}

                {m.curatorNote && (
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: "0.8rem",
                      opacity: 0.85,
                      background: "var(--color-pill-bg, rgba(0,0,0,0.04))",
                      borderRadius: 6,
                      padding: "6px 10px",
                    }}
                  >
                    <strong style={{ fontWeight: 600 }}>Curator's note:</strong> {m.curatorNote}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    marginTop: 10,
                    fontSize: "0.8rem",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  {m.email && <a href={`mailto:${m.email}`}>✉ {m.email}</a>}
                  {m.phone && (
                    <span style={{ opacity: 0.75 }}>
                      {m.phoneCountryCode} {m.phone}
                    </span>
                  )}
                  {waDigits && (
                    <a
                      href={`https://wa.me/${waDigits}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--paid)", fontWeight: 600 }}
                    >
                      ✆ WhatsApp
                    </a>
                  )}
                  {m.website && (
                    <a href={withProtocol(m.website)} target="_blank" rel="noreferrer">
                      Website ↗
                    </a>
                  )}
                  {m.socialMediaLink && (
                    <a href={withProtocol(m.socialMediaLink)} target="_blank" rel="noreferrer">
                      Social ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
