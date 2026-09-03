import { useState } from "react";
import * as demoApi from "../../api/demoApi";
import type { DemoRecord } from "../../types";
import { ArtistAvatar } from "../shared/ArtistAvatar";
import artistRoster from "../../data/artistRoster.json";

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

  async function addArtist(artistId: string) {
    const artist = artistRoster.find((a) => a.id === artistId);
    if (!artist) return;
    setBusyId(artistId);
    try {
      onUpdated(
        await demoApi.addProgramming(demo.id, {
          rosterArtistId: artist.id,
          name: artist.name,
          category: artist.category,
          priceQuoted: artist.priceRangeMin,
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
            {showRoster ? "Close roster" : "+ Add artist"}
          </button>
        )}
      </div>

      {demo.programming.length === 0 ? (
        <p style={{ opacity: 0.75 }}>No artists booked yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {demo.programming.map((entry) => (
            <div key={entry.id} className="card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ArtistAvatarByRosterId rosterArtistId={entry.rosterArtistId} fallbackName={entry.name} />
              <div style={{ flex: 1 }}>
                <strong>{entry.name}</strong>
                <div style={{ fontSize: "0.85rem", opacity: 0.75 }}>
                  {entry.category} · {entry.priceQuoted.toLocaleString()} {entry.currency}
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
          <h3 style={{ marginTop: 0 }}>Roster</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {artistRoster.map((artist) => (
              <div key={artist.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <ArtistAvatar initials={artist.avatarStyle.initials} colorSeed={artist.avatarStyle.colorSeed} size={32} />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: "0.9rem" }}>{artist.name}</strong>
                  <div style={{ fontSize: "0.78rem", opacity: 0.7 }}>{artist.category}</div>
                </div>
                <span style={{ fontSize: "0.78rem", opacity: 0.7 }}>
                  {artist.priceRangeMin.toLocaleString()}–{artist.priceRangeMax.toLocaleString()} {artist.currency}
                </span>
                <button
                  className="btn-secondary"
                  onClick={() => addArtist(artist.id)}
                  disabled={busyId === artist.id}
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

function ArtistAvatarByRosterId({
  rosterArtistId,
  fallbackName,
}: {
  rosterArtistId: string | null;
  fallbackName: string;
}) {
  const artist = artistRoster.find((a) => a.id === rosterArtistId);
  if (artist) {
    return <ArtistAvatar initials={artist.avatarStyle.initials} colorSeed={artist.avatarStyle.colorSeed} />;
  }
  const initials = fallbackName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return <ArtistAvatar initials={initials || "?"} colorSeed="#2C4741" />;
}
