import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import * as intakeApi from "../api/creativeIntakeApi";
import type { IntakeService, IntakeView } from "../api/creativeIntakeApi";
import type { TravelWillingness } from "../types";
import { Footer } from "../components/Footer";
import {
  budgetQuestionCopy,
  getServiceQuestionProfile,
  leadTimeQuestionCopy,
  outdoorQuestionCopy,
} from "./serviceQuestionProfiles";
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
//
// Round 2 (Sept 9, feedback after the first version shipped): a creative
// can now also fix their own name and rewrite each service's description
// (so services stop showing identical migrated-over bio text); an
// "Overview" screen up front shows what fields/services they're on file
// for before diving into questions; the outdoor question and the
// budget/lead-time wording adapt per service (see
// serviceQuestionProfiles.ts); budget accepts a free-text "describe it
// instead" answer that the Worker best-effort parses with AI (tagged
// ai_inferred, never self_reported — see that route); and Back now works
// from every step, not just between services.

const TRAVEL_OPTIONS: { value: TravelWillingness; label: string; hint: string }[] = [
  { value: "local", label: "Local only", hint: "Just your own city" },
  { value: "regional", label: "Regional", hint: "Nearby cities, a few hours away" },
  { value: "worldwide", label: "Worldwide", hint: "Anywhere, given enough notice" },
];

interface ServiceFormState {
  description: string;
  budgetMode: "number" | "text";
  budgetAmount: string;
  budgetCurrency: string;
  budgetText: string;
  outdoor: "yes" | "no" | "unsure";
  leadDays: string;
}

function formFromService(service: IntakeService): ServiceFormState {
  const hasBudgetNote = !!service.budgetNote?.trim();
  return {
    description: service.workDescription,
    budgetMode: hasBudgetNote ? "text" : "number",
    budgetAmount:
      service.hardFacts.minimumBudget.value != null ? String(service.hardFacts.minimumBudget.value.amount) : "",
    budgetCurrency: service.hardFacts.minimumBudget.value?.currency ?? "SAR",
    budgetText: service.budgetNote ?? "",
    outdoor:
      service.hardFacts.outdoorCapable.value === true
        ? "yes"
        : service.hardFacts.outdoorCapable.value === false
          ? "no"
          : "unsure",
    leadDays: service.hardFacts.leadTimeDays.value != null ? String(service.hardFacts.leadTimeDays.value) : "",
  };
}

type Step =
  | { kind: "welcome" }
  | { kind: "overview" }
  | { kind: "travel" }
  | { kind: "service"; service: IntakeService; index: number }
  | { kind: "empty" }
  | { kind: "done" };

function buildSteps(services: IntakeService[]): Step[] {
  if (services.length === 0) return [{ kind: "welcome" }, { kind: "empty" }];
  return [
    { kind: "welcome" },
    { kind: "overview" },
    { kind: "travel" },
    ...services.map((service, index) => ({ kind: "service" as const, service, index })),
    { kind: "done" },
  ];
}

function groupByField(services: IntakeService[]): [string, IntakeService[]][] {
  const map = new Map<string, IntakeService[]>();
  for (const s of services) {
    if (!map.has(s.creativeField)) map.set(s.creativeField, []);
    map.get(s.creativeField)!.push(s);
  }
  return [...map.entries()];
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

  const [stepIndex, setStepIndex] = useState(0);
  const [travelChoice, setTravelChoice] = useState<TravelWillingness | null>(null);
  const [serviceForms, setServiceForms] = useState<Record<string, ServiceFormState>>({});
  const [saving, setSaving] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

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
  const steps = buildSteps(services);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const firstName = view.displayName.split(" ")[0] || view.displayName;

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  async function saveName() {
    if (!creativeId || !nameDraft.trim()) return;
    setSavingName(true);
    try {
      const updated = await intakeApi.updateDisplayName(creativeId, nameDraft.trim());
      setView(updated);
      setEditingName(false);
    } finally {
      setSavingName(false);
    }
  }

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

  async function saveServiceAndAdvance(service: IntakeService, physical: boolean) {
    if (!creativeId) return;
    const form = serviceForms[service.id];
    setSaving(true);
    try {
      let minimumBudgetValue: { amount: number; currency: string } | null = null;
      let budgetNoteToSave = "";

      if (form.budgetMode === "text") {
        const text = form.budgetText.trim();
        budgetNoteToSave = text;
        if (text) {
          try {
            const guess = await intakeApi.parseBudgetText(creativeId, service.id, text);
            if (guess.amount != null) {
              minimumBudgetValue = { amount: guess.amount, currency: guess.currency ?? "SAR" };
            }
          } catch {
            // AI parsing failed — the raw text still saves below, the
            // number just stays "unknown" rather than guessed.
          }
        }
      } else if (form.budgetAmount.trim()) {
        minimumBudgetValue = { amount: Number(form.budgetAmount), currency: form.budgetCurrency || "SAR" };
      }

      const updated = await intakeApi.updateService(creativeId, service.id, {
        workDescription: form.description,
        budgetNote: budgetNoteToSave,
        hardFacts: {
          minimumBudget: { value: minimumBudgetValue },
          ...(physical ? { outdoorCapable: { value: form.outdoor === "unsure" ? null : form.outdoor === "yes" } } : {}),
          leadTimeDays: { value: form.leadDays.trim() ? Number(form.leadDays) : null },
        },
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
    if (!prevForm) return;
    setServiceForms((f) => ({
      ...f,
      [thisService.id]: {
        ...f[thisService.id],
        budgetMode: prevForm.budgetMode,
        budgetAmount: prevForm.budgetAmount,
        budgetCurrency: prevForm.budgetCurrency,
        budgetText: prevForm.budgetText,
        outdoor: prevForm.outdoor,
        leadDays: prevForm.leadDays,
      },
    }));
  }

  const progressTotal = 1 + services.length; // travel + N services
  const progressCurrent = step.kind === "travel" ? 0 : step.kind === "service" ? 1 + step.index : -1;

  // Pulled out here (rather than narrowed inside a JSX closure below) so
  // TypeScript's control-flow narrowing on `step.kind === "service"`
  // applies at the point of use, not across a nested function boundary.
  const activeService = step.kind === "service" ? step.service : null;
  const activeServiceIndex = step.kind === "service" ? step.index : -1;
  const activeForm = activeService ? serviceForms[activeService.id] : undefined;
  const activeProfile = activeService
    ? getServiceQuestionProfile(activeService.serviceName, activeService.creativeField)
    : null;

  return (
    <IntakeShell>
      {progressCurrent >= 0 && <Dots total={progressTotal} current={progressCurrent} />}

      {step.kind === "welcome" && (
        <div className="card intake-card intake-welcome">
          <p className="intake-eyebrow">Lamha × {view.displayName}</p>
          {!editingName ? (
            <h1 style={{ marginBottom: 8 }}>
              Hey {firstName} 👋{" "}
              <button
                type="button"
                className="intake-inline-edit"
                onClick={() => {
                  setNameDraft(view.displayName);
                  setEditingName(true);
                }}
              >
                Not you? Edit
              </button>
            </h1>
          ) : (
            <div className="intake-name-edit-row">
              <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Your name" />
              <button type="button" onClick={saveName} disabled={savingName || !nameDraft.trim()}>
                {savingName ? "Saving…" : "Save"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditingName(false)} disabled={savingName}>
                Cancel
              </button>
            </div>
          )}
          <p style={{ opacity: 0.78, fontSize: "1.02rem" }}>
            A couple of quick questions so we can match you with the right gigs — the ones that actually fit your
            budget, your travel range, and your timeline. Takes about two minutes, skip anything you're not sure
            about, and you can always come back to this exact link later.
          </p>
          <button onClick={() => setStepIndex(1)}>Let's go →</button>
        </div>
      )}

      {step.kind === "overview" && (
        <div className="card intake-card">
          <p className="intake-eyebrow">Here's what we have you down for</p>
          <h2 style={{ marginBottom: 4 }}>
            {services.length} {services.length === 1 ? "service" : "services"} across{" "}
            {groupByField(services).length} {groupByField(services).length === 1 ? "category" : "categories"}
          </h2>
          <p style={{ opacity: 0.7, fontSize: "0.9rem", marginBottom: 18 }}>
            If any of this looks wrong, don't worry about it now — reach out to whoever sent you this link once
            you're done. For everything else, we just need a few quick details on each one below.
          </p>
          <div className="intake-overview-list">
            {groupByField(services).map(([field, fieldServices]) => (
              <div key={field} className="intake-overview-group">
                <p className="intake-overview-field">{field}</p>
                <ul>
                  {fieldServices.map((s) => (
                    <li key={s.id}>{s.serviceName}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="intake-actions">
            <button type="button" className="btn-secondary" onClick={goBack}>
              ← Back
            </button>
            <button onClick={() => setStepIndex((i) => i + 1)} style={{ marginLeft: "auto" }}>
              Let's do it →
            </button>
          </div>
        </div>
      )}

      {step.kind === "travel" && (
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
            <button type="button" className="btn-secondary" onClick={goBack} disabled={saving}>
              ← Back
            </button>
            <button type="button" className="btn-secondary" onClick={() => saveTravel(null)} disabled={saving}>
              Not sure yet
            </button>
            <button onClick={() => saveTravel(travelChoice)} disabled={saving || !travelChoice}>
              {saving ? "Saving…" : "Next →"}
            </button>
          </div>
        </div>
      )}

      {activeService && activeForm && activeProfile && (
        <div className="card intake-card">
          <p className="intake-eyebrow">
            {activeServiceIndex + 1} of {services.length} · {activeService.creativeField}
          </p>
          <h2 style={{ marginBottom: 12 }}>{activeService.serviceName}</h2>

          <div style={{ marginBottom: 18 }}>
            <label>Tell us about you, specifically for {activeService.serviceName}</label>
            <textarea
              rows={3}
              placeholder="A sentence or two — this doesn't need to match your other services"
              value={activeForm.description}
              onChange={(e) =>
                setServiceForms((f) => ({
                  ...f,
                  [activeService.id]: { ...activeForm, description: e.target.value },
                }))
              }
            />
          </div>

          {activeServiceIndex > 0 && (
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: "0.78rem", padding: "6px 12px", marginBottom: 16 }}
              onClick={() => copyFromPrevious(activeServiceIndex)}
              title="Copies budget, travel-adjacent details, and lead time from the last service — not the description above"
            >
              ↺ Same budget/timing as last one
            </button>
          )}

          <div style={{ marginBottom: 18 }}>
            <label>{budgetQuestionCopy(activeService.serviceName, activeProfile.physical)}</label>
            {activeForm.budgetMode === "number" ? (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="number"
                    placeholder="Not sure"
                    value={activeForm.budgetAmount}
                    onChange={(e) =>
                      setServiceForms((f) => ({
                        ...f,
                        [activeService.id]: { ...activeForm, budgetAmount: e.target.value },
                      }))
                    }
                  />
                  <input
                    style={{ width: 90, flexShrink: 0 }}
                    value={activeForm.budgetCurrency}
                    onChange={(e) =>
                      setServiceForms((f) => ({
                        ...f,
                        [activeService.id]: { ...activeForm, budgetCurrency: e.target.value },
                      }))
                    }
                  />
                </div>
                <button
                  type="button"
                  className="intake-link-toggle"
                  onClick={() =>
                    setServiceForms((f) => ({ ...f, [activeService.id]: { ...activeForm, budgetMode: "text" } }))
                  }
                >
                  Hard to give a number? Describe it instead →
                </button>
              </>
            ) : (
              <>
                <textarea
                  rows={2}
                  placeholder="e.g. Depends a lot on the event, but rarely under 3,000 SAR for a half-day"
                  value={activeForm.budgetText}
                  onChange={(e) =>
                    setServiceForms((f) => ({
                      ...f,
                      [activeService.id]: { ...activeForm, budgetText: e.target.value },
                    }))
                  }
                />
                <button
                  type="button"
                  className="intake-link-toggle"
                  onClick={() =>
                    setServiceForms((f) => ({ ...f, [activeService.id]: { ...activeForm, budgetMode: "number" } }))
                  }
                >
                  ← Enter a number instead
                </button>
              </>
            )}
          </div>

          {activeProfile.physical && (
            <div style={{ marginBottom: 18 }}>
              <label>{outdoorQuestionCopy(activeService.serviceName)}</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["yes", "no", "unsure"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`intake-pill-choice${activeForm.outdoor === opt ? " selected" : ""}`}
                    onClick={() =>
                      setServiceForms((f) => ({ ...f, [activeService.id]: { ...activeForm, outdoor: opt } }))
                    }
                  >
                    {opt === "yes" ? "Yes" : opt === "no" ? "Indoor only" : "Not sure"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 6 }}>
            <label>{leadTimeQuestionCopy(activeProfile.physical)} (days)</label>
            <input
              type="number"
              placeholder="Not sure"
              value={activeForm.leadDays}
              onChange={(e) =>
                setServiceForms((f) => ({ ...f, [activeService.id]: { ...activeForm, leadDays: e.target.value } }))
              }
            />
          </div>

          <div className="intake-actions">
            <button type="button" className="btn-secondary" onClick={goBack} disabled={saving}>
              ← Back
            </button>
            <button
              onClick={() => saveServiceAndAdvance(activeService, activeProfile.physical)}
              disabled={saving}
              style={{ marginLeft: "auto" }}
            >
              {saving ? "Saving…" : activeServiceIndex === services.length - 1 ? "Finish →" : "Next →"}
            </button>
          </div>
        </div>
      )}

      {step.kind === "empty" && (
        <div className="card intake-card">
          <h2>Nothing to fill in just yet</h2>
          <p style={{ opacity: 0.75 }}>
            We don't have any services on file for you yet — reach out to whoever sent you this link and they'll
            get one added, then you can come back to this exact link.
          </p>
        </div>
      )}

      {step.kind === "done" && (
        <div className="card intake-card intake-welcome">
          <p className="intake-eyebrow">All set</p>
          <h1 style={{ marginBottom: 8 }}>Thanks, {firstName}!</h1>
          <p style={{ opacity: 0.78, fontSize: "1.02rem" }}>
            You've told us about {services.length === 1 ? "your service" : `all ${services.length} of your services`}.
            This helps us bring you the gigs that are actually a fit. Bookmark this link — you can come back and
            update anything, anytime.
          </p>
          <button type="button" className="btn-secondary" onClick={goBack} style={{ marginTop: 8 }}>
            ← Go back and change something
          </button>
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
