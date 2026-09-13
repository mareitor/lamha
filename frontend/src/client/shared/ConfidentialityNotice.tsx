// Confidentiality banner (Sept 2026, Mario's request) — sits below the
// page header on both client-facing pages (Dashboard and Planner).
// Deliberately not dismissible or gated by demo.kind: it's a legal note
// about the work itself, not a demo-vs-live UI affordance, so it applies
// the same way whether the client is evaluating a pitch or looking at
// their own live engagement.
export function ConfidentialityNotice() {
  return (
    <p className="confidentiality-notice">
      This program — including all artist curation, location strategy, and creative
      direction — is the confidential, proprietary work of <em>Lamha</em>, developed
      specifically for this engagement. It is shared for your evaluation only and may
      not be shared with, or used by, any third party without our written consent.
    </p>
  );
}
