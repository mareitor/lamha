import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as demoApi from "../api/demoApi";
import type { DemoRecord } from "../types";
import { ThemeProvider } from "../theme/ThemeProvider";
import { CountdownBadge } from "./CountdownBadge";
import { ExpiredNotice } from "./ExpiredNotice";
import { useCountdown } from "../hooks/useCountdown";
import { OnboardingWizard } from "./onboarding/OnboardingWizard";
import { ClientDashboard } from "./dashboard/ClientDashboard";
import { Footer } from "../components/Footer";

// The single place expiry logic lives (plan doc, section E). Fetches
// fresh from the server every load — so a client returning cold after 14
// days gets the correct state from the server's clock, not stale local
// memory — and additionally ticks a local countdown so a tab left open
// flips to the expired view instantly at the second it crosses zero,
// with no network round-trip needed at that exact moment.
export function DemoShell() {
  const { demoId } = useParams<{ demoId: string }>();
  const queryClient = useQueryClient();
  const queryKey = ["demo", demoId];

  const query = useQuery({
    queryKey,
    queryFn: () => demoApi.getDemo(demoId!),
    enabled: !!demoId,
    retry: false,
  });

  // Children call this after a mutation (onboarding submit, programming
  // edit, mode toggle, ...) with the fresh record the API returned.
  // Writing straight into the React Query cache — rather than separate
  // local state — means there's exactly one source of truth for "the
  // current demo", so a re-render always shows the latest write.
  function handleUpdated(updated: DemoRecord) {
    queryClient.setQueryData(queryKey, updated);
  }

  const demo = query.data;
  const countdown = useCountdown(demo?.expiresAt ?? null);
  const locallyExpired = countdown?.expired ?? false;

  if (!demoId) return null;

  if (query.isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>Loading…</p>
      </div>
    );
  }

  if (query.isError || !demo) {
    // Same generic shape whether the ID never existed or the demo was
    // purged — never confirm/deny which, from outside (plan doc note).
    return <ExpiredNotice />;
  }

  const isExpired = demo.status === "expired" || locallyExpired;

  return (
    <ThemeProvider override={demo.branding}>
      {isExpired ? (
        <ExpiredNotice />
      ) : (
        <>
          <CountdownBadge expiresAt={demo.expiresAt} />
          {demo.onboardingComplete ? (
            <ClientDashboard demo={demo} onUpdated={handleUpdated} />
          ) : (
            <OnboardingWizard demo={demo} onComplete={handleUpdated} />
          )}
          <Footer />
        </>
      )}
    </ThemeProvider>
  );
}
