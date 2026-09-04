import { useState } from "react";
import * as demoApi from "../../api/demoApi";
import type { DemoRecord, EventSpecs, PaymentPolicy } from "../../types";

interface Props {
  demo: DemoRecord;
  onComplete: (demo: DemoRecord) => void;
}

type Step = "event" | "payment" | "mode";

export function OnboardingWizard({ demo, onComplete }: Props) {
  const [step, setStep] = useState<Step>("event");
  const [event, setEvent] = useState<EventSpecs>(demo.event);
  const [paymentPolicy, setPaymentPolicy] = useState<PaymentPolicy>(demo.paymentPolicy);
  const [submitting, setSubmitting] = useState(false);

  async function finish() {
    setSubmitting(true);
    try {
      const updated = await demoApi.submitOnboarding(demo.id, { event, paymentPolicy });
      onComplete(updated);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ paddingTop: "8vh", paddingBottom: 64, maxWidth: 560 }}>
      <p className="pill">Welcome, {demo.branding.companyDisplayName}</p>
      <h1>Let's set up your event</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
        {(["event", "payment", "mode"] as Step[]).map((s) => (
          <div
            key={s}
            style={{
              height: 4,
              flex: 1,
              borderRadius: 2,
              background: step === s || stepIndex(s) < stepIndex(step) ? "var(--color-accent)" : "var(--color-pill-bg)",
            }}
          />
        ))}
      </div>

      {step === "event" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Tell us about your event</h3>
          <label>Event name</label>
          <input value={event.eventName} onChange={(e) => setEvent({ ...event, eventName: e.target.value })} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
            <div>
              <label>Start date</label>
              <input type="date" value={event.startDate} onChange={(e) => setEvent({ ...event, startDate: e.target.value })} />
            </div>
            <div>
              <label>End date</label>
              <input type="date" value={event.endDate} onChange={(e) => setEvent({ ...event, endDate: e.target.value })} />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <label>Location</label>
            <input value={event.location} onChange={(e) => setEvent({ ...event, location: e.target.value })} />
          </div>

          <div style={{ marginTop: 16 }}>
            <label>Expected attendees</label>
            <input
              type="number"
              value={event.expectedAttendees ?? ""}
              onChange={(e) => setEvent({ ...event, expectedAttendees: e.target.value ? Number(e.target.value) : null })}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <label>Anything else we should know?</label>
            <textarea rows={3} value={event.notes} onChange={(e) => setEvent({ ...event, notes: e.target.value })} />
          </div>

          <button style={{ marginTop: 20 }} onClick={() => setStep("payment")} disabled={!event.eventName.trim()}>
            Continue
          </button>
        </div>
      )}

      {step === "payment" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Payment policy</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label>Currency</label>
              <input value={paymentPolicy.currency} onChange={(e) => setPaymentPolicy({ ...paymentPolicy, currency: e.target.value })} />
            </div>
            <div>
              <label>Payment terms (days)</label>
              <input
                type="number"
                value={paymentPolicy.paymentTermsDays}
                onChange={(e) => setPaymentPolicy({ ...paymentPolicy, paymentTermsDays: Number(e.target.value) })}
              />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label>Deposit %</label>
            <input
              type="number"
              value={paymentPolicy.depositPercent}
              onChange={(e) => setPaymentPolicy({ ...paymentPolicy, depositPercent: Number(e.target.value) })}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <label>Invoicing contact name</label>
            <input
              value={paymentPolicy.invoicingContactName}
              onChange={(e) => setPaymentPolicy({ ...paymentPolicy, invoicingContactName: e.target.value })}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <label>Invoicing contact email</label>
            <input
              value={paymentPolicy.invoicingContactEmail}
              onChange={(e) => setPaymentPolicy({ ...paymentPolicy, invoicingContactEmail: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button className="btn-secondary" onClick={() => setStep("event")}>
              Back
            </button>
            <button onClick={() => setStep("mode")}>Continue</button>
          </div>
        </div>
      )}

      {step === "mode" && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>How would you like to work with us?</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <ModeOption
              selected
              title="Fully managed"
              description="We handle your creative programming, budget, and invoicing for you. You get a live, read-only view."
            />
            <div
              style={{
                textAlign: "left",
                padding: 16,
                borderRadius: 10,
                border: "1.5px solid var(--color-pill-bg)",
                opacity: 0.6,
                cursor: "not-allowed",
              }}
              title="Self-service is in closed beta — reach out to our team to enable it."
            >
              <strong style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                Self-service
                <span
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "var(--color-primary)",
                    opacity: 0.6,
                    border: "1px solid var(--color-primary)",
                    borderRadius: 100,
                    padding: "2px 7px",
                  }}
                >
                  Closed beta
                </span>
              </strong>
              <span style={{ fontSize: "0.85rem", fontWeight: 400, opacity: 0.9 }}>
                Edit your own creatives, programming, and budget directly. Not open yet — talk to your Basa
                Studio contact if you'd like early access.
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button className="btn-secondary" onClick={() => setStep("payment")}>
              Back
            </button>
            <button onClick={finish} disabled={submitting}>
              {submitting ? "Setting up…" : "Enter demo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function stepIndex(s: Step): number {
  return ["event", "payment", "mode"].indexOf(s);
}

// The only real (selected, non-interactive) option now that self-service
// is closed beta — rendered as a static highlighted block rather than a
// button since there's nothing left to toggle to.
function ModeOption({
  selected,
  title,
  description,
}: {
  selected: boolean;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        textAlign: "left",
        padding: 16,
        borderRadius: 10,
        border: `1.5px solid var(${selected ? "--color-accent" : "--color-pill-bg"})`,
        background: selected ? "var(--accent-tint, var(--color-pill-bg))" : "transparent",
      }}
    >
      <strong style={{ display: "block", marginBottom: 4 }}>{title}</strong>
      <span style={{ fontSize: "0.85rem", fontWeight: 400, opacity: 0.9 }}>{description}</span>
    </div>
  );
}
