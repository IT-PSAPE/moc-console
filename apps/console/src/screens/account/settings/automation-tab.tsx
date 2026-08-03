import { ArchiveAutomationsSection } from "./archive-automations-section";
import { StaleAlertsSection } from "./stale-alerts-section";

export function AutomationTab() {
    return (
        <div className="flex flex-col gap-10">
            <StaleAlertsSection />
            <ArchiveAutomationsSection />
        </div>
    );
}
