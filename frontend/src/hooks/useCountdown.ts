import { useEffect, useState } from "react";

export interface CountdownParts {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function computeParts(expiresAt: number): CountdownParts {
  const totalMs = expiresAt - Date.now();
  if (totalMs <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const days = Math.floor(totalMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((totalMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((totalMs % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((totalMs % (60 * 1000)) / 1000);
  return { totalMs, days, hours, minutes, seconds, expired: false };
}

// Ticks every second, computing time-until-expiry purely from the
// client's clock against a server-provided `expiresAt`. This is what
// makes a tab left open flip to the expired view the instant it crosses
// zero, with no network round-trip needed at that moment — the server
// remains the real authority for writes (see requireNotExpired
// middleware); this hook only drives what the client *displays*.
export function useCountdown(expiresAt: number | null): CountdownParts | null {
  const [parts, setParts] = useState<CountdownParts | null>(
    expiresAt ? computeParts(expiresAt) : null,
  );

  useEffect(() => {
    if (!expiresAt) {
      setParts(null);
      return;
    }
    setParts(computeParts(expiresAt));
    const interval = setInterval(() => {
      setParts(computeParts(expiresAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return parts;
}
