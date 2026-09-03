import type { DemoRecord } from "../../types";
import { useTheme } from "../../theme/ThemeProvider";
import { ModeToggle } from "./ModeToggle";
import { ProgrammingSection } from "./ProgrammingSection";
import { BudgetSection } from "./BudgetSection";
import { InvoicesSection } from "./InvoicesSection";

export function ClientDashboard({
  demo,
  onUpdated,
}: {
  demo: DemoRecord;
  onUpdated: (demo: DemoRecord) => void;
}) {
  const theme = useTheme();

  return (
    <div className="container" style={{ paddingTop: 40 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <img src={theme.logoUrl} alt={theme.companyDisplayName} style={{ height: 40, maxWidth: 160, objectFit: "contain" }} />
        <div>
          <h1 style={{ margin: 0, fontSize: "1.6rem" }}>{demo.event.eventName || demo.branding.companyDisplayName}</h1>
          {demo.event.location && (
            <p style={{ margin: "2px 0 0", fontSize: "0.85rem", opacity: 0.75 }}>
              {demo.event.location}
              {demo.event.startDate ? ` · ${demo.event.startDate}${demo.event.endDate ? ` – ${demo.event.endDate}` : ""}` : ""}
            </p>
          )}
        </div>
      </header>

      <ModeToggle demo={demo} onUpdated={onUpdated} />
      <ProgrammingSection demo={demo} onUpdated={onUpdated} />
      <BudgetSection demo={demo} onUpdated={onUpdated} />
      <InvoicesSection demo={demo} />
    </div>
  );
}
