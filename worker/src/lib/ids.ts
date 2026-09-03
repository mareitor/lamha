// Unguessable demo ID generation.
//
// 16 random bytes -> base32 (Crockford alphabet, no ambiguous chars,
// URL-safe, no padding) -> ~26 lowercase characters. Not derived from
// company name or any predictable input.

const BASE32_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz"; // Crockford, no I/L/O/U

export function generateDemoId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Encode as base32 by treating the byte array as a bit stream.
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function generateItemId(): string {
  // Shorter ID for sub-entities (programming/invoice items) — collision
  // risk is scoped to a single demo's array, so 10 bytes is plenty.
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
