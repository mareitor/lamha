import { useState } from "react";
import * as demoApi from "../../api/demoApi";
import type { DemoRecord } from "../../types";
import { CreativeAvatar } from "../shared/CreativeAvatar";
import creativeRoster from "../../data/creativeRoster.json";

export function ProgrammingSection({
  demo,
  onUpdated,
}: {
  demo: DemoRecord;
  onUpdated: (demo: DemoRecord) => void;
}) {
  const editable = demo.mode === "self-service";
  const [showRoster, setShowRoster] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function addCreative(creativeId: string) {
    const creative = creativeRoster.find((a) => a.id === creativeId);
    if (!creative) return;
    setBusyId(creativeId);
    try {
      onUpdated(
        await demoApi.addProgramming(demo.id, {
          rosterCreativeId: creative.id,
          name: creative.name,
          creativeField: creative.creativeField,
          creativeService: creative.creativeService,
          priceQuoted: creative.priceRangeMin,
          currency: demo.budget.currency,
          status: "proposed",
        }),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function removeEntry(itemId: string) {
    setBusyId(itemId);
    try {
      onUpdated(await demoApi.deleteProgramming(demo.id, itemId));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section style={{ marginTop: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Your programming</h2>
        {editable && (
          <button className="btn-secondary" onClick={() => setShowRoster((v) => !v)}>
            {showRoster ? "Close roster" : "+ Add creative"}
          </button>
        )}
      </div>

      {demo.programming.length === 0 ? (
        <p style={{ opacity: 0.75 }}>No creatives booked yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {demo.programming.map((entry) => (
            <div key={entry.id} className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <CreativeAvatarByRosterId rosterCreativeId={entry.rosterCreativeId} fallbackName={entry.name} />
              <div style={{ flex: 1 }}>
                <strong>{entry.name}</strong>
                <div style={{ fontSize: "0.85rem", opacity: 0.75 }}>
                  {entry.creativeService} · {entry.priceQuoted.toLocaleString()} {entry.currency}
                </div>
              </div>
              <span className="pill">{entry.status}</span>
              {editable && (
                <button
                  className="btn-secondary"
                  onClick={() => removeEntry(entry.id)}
                  disabled={busyId === entry.id}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && showRoster && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Creative roster</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {creativeRoster.map((creative) => (
              <div key={creative.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <CreativeAvatar initials={creative.avatarStyle.initials} colorSeed={creative.avatarStyle.colorSeed} size={32} />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: "0.9rem" }}>{creative.name}</strong>
                  <div style={{ fontSize: "0.78rem", opacity: 0.7 }}>{creative.creativeService}</div>
                </div>
                <span style={{ fontSize: "0.78rem", opacity: 0.7 }}>
                  {creative.priceRangeMin.toLocaleString()}–{creative.priceRangeMax.toLocaleString()} {creative.currency}
                </span>
                <button
                  className="btn-secondary"
                  onClick={() => addCreative(creative.id)}
                  disabled={busyId === creative.id}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function CreativeAvatarByRosterId({
  rosterCreativeId,
  fallbackName,
}: {
  rosterCreativeId: string | null;
  fallbackName: string;
}) {
  const creative = creativeRoster.find((a) => a.id === rosterCreativeId);
  if (creative) {
    return <CreativeAvatar initials={creative.avatarStyle.initials} colorSeed={creative.avatarStyle.colorSeed} />;
  }
  const initials = fallbackName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return <CreativeAvatar initials={initials || "?"} colorSeed="#2C4741" />;
}
