import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import * as intakeApi from "../api/creativeIntakeApi";
import type { IntakeService, IntakeView } from "../api/creativeIntakeApi";
import type { TravelWillingness } from "../types";
import { Footer } from "../components/Footer";
import "./creativeIntake.css";

// Creative self-intake (Sept 2026, schema v2 Phase 2). Mario, Sept 9:
// "why don't we reach out to the creatives and ask them?" — instead of
// his team hand-filling every hard fact from the admin side. Public page,
// no login: the creative's own id in the URL is the whole "auth" (same
// trust model as a demo client link — see requireCreativeExists on the
// Worker). One question at a time, skip-friendly, saves as it goes so
// the link itself doubles as "come back and finish later."
//
// Deliberately asks travel willingness ONCE and applies it to every
// service (Mario's "some answers would be the same for every service"
// complaint) — everything else (budget/outdoor/lead time) is genuinely
// per-service, but gets a "Same as last one" shortcut after the first.

type StepKind = "welcome" | "travel" | "service" | "empty" | "done" | "not-found" | "loading";

const TRAVEL_OPTIONS: { value: TravelWillingness; label: string; hint: string }[] = [
  { value: "local", label: "Local only", hint: "Just your own city" },
  { value: "regional", label: "Regional", hint: "Nearby cities, a few hours away" },
  { value: "worldwide", label: "Worldwide", hint: "Anywhere, given enough notice" },
];

interface ServiceFormState {
  budgetAmount: string;
  budgetCurrency: string;
  outdoor: "yes" | "no" | "unsure";
  leadDays: string;
}

function formFromService(service: IntakeService): ServiceFormState {
  return {
    budgetAmount: service.hardFacts.minimumBudget.value != null ? String(service.hardFacts.minimumBudget.value.amount) : "",
    budgetCurrency: service.hardFacts.minimumBudget.value?.currency ?? "SAR",
    outdoor:
      service.hardFacts.outdoorCapable.value === true
        ? "yes"
        : service.hardFacts.outdoorCapable.value === false
          ? "no"
          : "unsure",
    leadDays: service.hardFacts.leadTimeDays.value != null ? String(service.hardFacts.leadTimeDays.value) : "",
  };
}

function Dots({ total, current }: { total: number; current: number }) {
  return (
    <div className="intake-dots" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`intake-dot${i <= current ? " filled" : ""}`} />
      ))}
    </div>
  );
}

export function CreativeIntakePage() {
  const { creativeId } = useParams<{ creativeId: string }>();
  const [view, setView] = useState<IntakeView | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "not-found">("loading");

  const [stepIndex, setStepIndex] = useState(0); // 0 = welcome, 1 = travel, 2..N+1 = services, N+2 = done
  const [travelChoice, setTravelChoice] = useState<TravelWillingness | null>(null);
  const [serviceForms, setServiceForms] = useState<Record<string, ServiceFormState>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!creativeId) return;
    intakeApi
      .getIntakeView(creativeId)
      .then((v) => {
        setView(v);
        setTravelChoice(v.travelWillingnessHint);
        setServiceForms(Object.fromEntries(v.services.map((s) => [s.id, formFromService(s)])));
        setStatus("ready");
      })
      .catch(() => setStatus("not-found"));
  }, [creativeId]);

  if (!creativeId || status === "not-found") {
    return (
      <IntakeShell>
        <div className="card intake-card">
          <h2>This link doesn't look right</h2>
          <p style={{ opacity: 0.75 }}>
            Double-check you copied the whole thing, or reach out to whoever sent it to you for a fresh link.
          </p>
        </div>
      </IntakeShell>
    );
  }

  if (status === "loading" || !view) {
    return (
      <IntakeShell>
        <p style={{ opacity: 0.6 }}>Loading…</p>
      </IntakeShell>
    );
  }

  const services = view.services;
  const totalSteps = 2 + services.length; // welcome + travel + N services (done screen isn't counted in dots)
  const kind: StepKind =
    stepIndex === 0
      ? "welcome"
      : stepIndex === 1
        ? "travel"
        : stepIndex - 2 < services.length
          ? "service"
          : services.length === 0 && stepIndex === 2
            ? "empty"
            : "done";

  // Takes the value explicitly rather than reading `travelChoice` from
  // closure — the "Not sure yet" button needs to save null immediately
  // after clearing the selection, and setTravelChoice(null) wouldn't be
  // visible to this closure until the next render.
  async function saveTravel(value: TravelWillingness | null) {
    if (!creativeId) return;
    setSaving(true);
    try {
      const updated = await intakeApi.setTravelWillingness(creativeId, value);
      setView(updated);
      setTravelChoice(value);
      setStepIndex((i) => i + 1);
    } finally {
      setSaving(false);
    }
  }

  async function saveServiceAndAdvance(service: IntakeService) {
    if (!creativeId) return;
    const form = serviceForms[service.id];
    setSaving(true);
    try {
      const updated = await intakeApi.updateServiceHardFacts(creativeId, service.id, {
        minimumBudget: {
          value: form.budgetAmount.trim()
            ? { amount: Number(form.budgetAmount), currency: form.budgetCurrency || "SAR" }
            : null,
        },
        outdoorCapable: { value: form.outdoor === "unsure" ? null : form.outdoor === "yes" },
        leadTimeDays: { value: form.leadDays.trim() ? Number(form.leadDays) : null },
      });
      setView(updated);
      setStepIndex((i) => i + 1);
    } finally {
      setSaving(false);
    }
  }

  function copyFromPrevious(serviceIndex: number) {
    if (serviceIndex === 0) return;
    const prevService = services[serviceIndex - 1];
    const prevForm = serviceForms[prevService.id];
    const thisService = services[serviceIndex];
    setServiceForms((f) => ({ ...f, [thisService.id]: { ...prevForm } }));
  }

  return (
    <IntakeShell>
      {kind !== "welcome" && kind !== "done" && kind !== "empty" && (
        <Dots total={totalSteps} current={Math.min(stepIndex, totalSteps - 1)} />
      )}

      {kind === "welcome" && (
        <div className="card intake-card intake-welcome">
          <p className="intake-eyebrow">Lamha × {view.displayName}</p>
          <h1 style={{ marginBottom: 8 }}>Hey {view.displayName.split(" ")[0] || view.displayName} 👋</h1>
          <p style={{ opacity: 0.78, fontSize: "1.02rem" }}>
            A couple of quick questions so we can match you with the right gigs — the ones that actually fit your
            budget, your travel range, and your timeline. Takes about two minutes, skip anything you're not sure
            about, and you can always come back to this exact link later.
          </p>
          <button onClick={() => setStepIndex(1)}>Let's go →</button>
        </div>
      )}

      {kind === "travel" && (
        <div className="card intake-card">
          <p className="intake-eyebrow">One question, applies to everything</p>
          <h2>How far will you travel for a booking?</h2>
          <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
            {TRAVEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`intake-choice${travelChoice === opt.value ? " selected" : ""}`}
                onClick={() => setTravelChoice(opt.value)}
              >
                <strong>{opt.label}</strong>
                <span>{opt.hint}</span>
              </button>
            ))}
          </div>
          <div className="intake-actions">
            <button type="button" className="btn-secondary" onClick={() => saveTravel(null)} disabled={saving}>
              Not sure yet
            </button>
            <button onClick={() => saveTravel(travelChoice)} disabled={saving || !travelChoice}>
              {saving ? "Saving…" : "Next →"}
            </button>
          </div>
        </div>
      )}

      {kind === "service" &&
        (() => {
          const serviceIndex = stepIndex - 2;
          const service = services[serviceIndex];
          const form = serviceForms[service.id];
          if (!form) return null;
          return (
            <div className="card intake-card">
              <p className="intake-eyebrow">
                {serviceIndex + 1} of {services.length} · {service.creativeField}
              </p>
              <h2 style={{ marginBottom: 4 }}>{service.serviceName}</h2>
              {service.workDescription && (
                <p style={{ opacity: 0.6, fontSize: "0.88rem", marginBottom: 20 }}>{service.workDescription}</p>
              )}

              {serviceIndex > 0 && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: "0.78rem", padding: "6px 12px", marginBottom: 16 }}
                  onClick={() => copyFromPrevious(serviceIndex)}
                >
                  ↺ Same as last one
                </button>
              )}

              <div style={{ marginBottom: 18 }}>
                <label>What's your usual minimum budget for this?</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="number"
                    placeholder="Not sure"
                    value={form.budgetAmount}
                    onChange={(e) =>
                      setServiceForms((f) => ({ ...f, [service.id]: { ...form, budgetAmount: e.target.value } }))
                    }
                  />
                  <input
                    style={{ width: 90, flexShrink: 0 }}
                    value={form.budgetCurrency}
                    onChange={(e) =>
                      setServiceForms((f) => ({ ...f, [service.id]: { ...form, budgetCurrency: e.target.value } }))
                    }
                  />
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label>Comfortable working outdoors?</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["yes", "no", "unsure"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`intake-pill-choice${form.outdoor === opt ? " selected" : ""}`}
                      onClick={() => setServiceForms((f) => ({ ...f, [service.id]: { ...form, outdoor: opt } }))}
                    >
                      {opt === "yes" ? "Yes" : opt === "no" ? "Indoor only" : "Not sure"}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 6 }}>
                <label>How much notice do you usually need? (days)</label>
                <input
                  type="number"
                  placeholder="Not sure"
                  value={form.leadDays}
                  onChange={(e) =>
                    setServiceForms((f) => ({ ...f, [service.id]: { ...form, leadDays: e.target.value } }))
                  }
                />
              </div>

              <div className="intake-actions">
                {serviceIndex > 0 && (
                  <button type="button" className="btn-secondary" onClick={() => setStepIndex((i) => i - 1)} disabled={saving}>
                    ← Back
                  </button>
                )}
                <button onClick={() => saveServiceAndAdvance(service)} disabled={saving} style={{ marginLeft: "auto" }}>
                  {saving ? "Saving…" : serviceIndex === services.length - 1 ? "Finish →" : "Next →"}
                </button>
              </div>
            </div>
          );
        })()}

      {kind === "empty" && (
        <div className="card intake-card">
          <h2>Nothing to fill in just yet</h2>
          <p style={{ opacity: 0.75 }}>
            We don't have any services on file for you yet — reach out to whoever sent you this link and they'll
            get one added, then you can come back to this exact link.
          </p>
        </div>
      )}

      {kind === "done" && (
        <div className="card intake-card intake-welcome">
          <p className="intake-eyebrow">All set</p>
          <h1 style={{ marginBottom: 8 }}>Thanks, {view.displayName.split(" ")[0] || view.displayName}!</h1>
          <p style={{ opacity: 0.78, fontSize: "1.02rem" }}>
            You've told us about {services.length === 1 ? "your service" : `all ${services.length} of your services`}.
            This helps us bring you the gigs that are actually a fit. Bookmark this link — you can come back and
            update anything, anytime.
          </p>
        </div>
      )}
    </IntakeShell>
  );
}

function IntakeShell({ children }: { children: ReactNode }) {
  return (
    <div className="intake-page">
      <div className="intake-content">{children}</div>
      <Footer />
    </div>
  );
}
