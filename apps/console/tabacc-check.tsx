// TEMPORARY verification harness for Tabs + Accordion migration. Delete after use.
import "@moc/ui/styles.css";
import { Accordion } from "@moc/ui/components/display/accordion";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { Tabs } from "@moc/ui/components/layout/tabs";
import { ChevronDown } from "lucide-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function Demo() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <Tabs defaultTab="one" variant="pill">
                <Tabs.List>
                    <Tabs.Tab value="one">One</Tabs.Tab>
                    <Tabs.Tab value="two">Two</Tabs.Tab>
                    <Tabs.Tab value="three">Three</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panels className="pt-3">
                    <Tabs.Panel value="one"><Paragraph.sm>Panel one content</Paragraph.sm></Tabs.Panel>
                    <Tabs.Panel value="two"><Paragraph.sm>Panel two content</Paragraph.sm></Tabs.Panel>
                    <Tabs.Panel value="three"><Paragraph.sm>Panel three content</Paragraph.sm></Tabs.Panel>
                </Tabs.Panels>
            </Tabs>

            <Accordion type="single" defaultValue="a">
                <Accordion.Item value="a" className="border-b border-secondary">
                    <Accordion.Trigger className="flex items-center justify-between py-3">
                        <Label.sm>Section A</Label.sm>
                        <ChevronDown className="size-4 text-tertiary transition-transform group-data-[panel-open]:rotate-180" />
                    </Accordion.Trigger>
                    <Accordion.Content>
                        <div className="pb-3"><Paragraph.sm className="text-tertiary">Body of section A.</Paragraph.sm></div>
                    </Accordion.Content>
                </Accordion.Item>
                <Accordion.Item value="b" className="border-b border-secondary">
                    <Accordion.Trigger className="flex items-center justify-between py-3">
                        <Label.sm>Section B</Label.sm>
                        <ChevronDown className="size-4 text-tertiary transition-transform group-data-[panel-open]:rotate-180" />
                    </Accordion.Trigger>
                    <Accordion.Content>
                        <div className="pb-3"><Paragraph.sm className="text-tertiary">Body of section B.</Paragraph.sm></div>
                    </Accordion.Content>
                </Accordion.Item>
            </Accordion>
        </div>
    );
}
createRoot(document.getElementById("root")!).render(<StrictMode><Demo /></StrictMode>);
