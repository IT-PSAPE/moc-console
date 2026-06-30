import { Divider } from "@moc/ui/components/display/divider";
import { ArchiveAutomationsSection } from "./archive-automations-section";
import { StaleAlertsSection } from "./stale-alerts-section";

export function AutomationTab() {
    return (
        <>
            <StaleAlertsSection />

            <Divider className="py-6" />

            <ArchiveAutomationsSection />
        </>
    );
}
