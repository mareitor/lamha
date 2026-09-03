// No photos anywhere in the roster (spec 7) — every avatar is a
// CSS-generated colored circle with initials, driven entirely by data
// already in artistRoster.json (colorSeed + initials). No image asset,
// no external request, no risk of ever showing a real person's photo.
export function ArtistAvatar({
  initials,
  colorSeed,
  size = 40,
}: {
  initials: string;
  colorSeed: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: colorSeed,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-heading)",
        fontSize: size * 0.4,
        flexShrink: 0,
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
