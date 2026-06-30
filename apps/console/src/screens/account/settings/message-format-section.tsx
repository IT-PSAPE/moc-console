import { Section } from "@moc/ui/components/display/section";
import { Divider } from "@moc/ui/components/display/divider";
import { Select } from "@moc/ui/components/form/select";
import { Label, Paragraph } from "@moc/ui/components/display/text";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { useWorkspace } from "@/lib/workspace-context";
import {
    DATE_FORMAT_OPTIONS,
    DEFAULT_DATE_FORMAT,
    DEFAULT_TIMEZONE,
    formatInstant,
    type DateFormatPreset,
} from "@/data/notification-templates-core";
import {
    fetchNotificationSettings,
    updateMessageFormat,
} from "@/data/notification-settings";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";

const COMMON_TIMEZONES = [
    "Africa/Harare",
    "Africa/Johannesburg",
    "Africa/Lagos",
    "Africa/Nairobi",
    "Europe/London",
    "Europe/Berlin",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Asia/Dubai",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Australia/Sydney",
    "UTC",
];

// A fixed instant (a Thursday evening) used purely to render the live
// "e.g. …" previews next to each control.
const PREVIEW_ISO = "2026-05-21T17:00:00Z";

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error";
}

export function MessageFormatSection() {
    const { toast } = useFeedback();
    const { currentWorkspaceId } = useWorkspace();

    const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
    const [dateFormat, setDateFormat] = useState<DateFormatPreset>(DEFAULT_DATE_FORMAT);
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async () => {
        if (!currentWorkspaceId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const settings = await fetchNotificationSettings(currentWorkspaceId);
            setTimezone(settings.timezone);
            setDateFormat(settings.dateFormat);
        } catch (error) {
            toast({
                title: "Couldn't load formatting settings",
                description: errorMessage(error),
                variant: "error",
            });
        } finally {
            setIsLoading(false);
        }
    }, [currentWorkspaceId, toast]);

    useEffect(() => {
        void load();
    }, [load]);

    const save = useCallback(
        async (nextTimezone: string, nextFormat: DateFormatPreset) => {
            if (!currentWorkspaceId) return;
            try {
                await updateMessageFormat(currentWorkspaceId, nextTimezone, nextFormat);
                toast({ title: "Message format updated", variant: "success" });
            } catch (error) {
                toast({
                    title: "Couldn't update format",
                    description: errorMessage(error),
                    variant: "error",
                });
                void load();
            }
        },
        [currentWorkspaceId, load, toast],
    );

    const handleTimezone = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => {
            const next = event.target.value;
            setTimezone(next);
            void save(next, dateFormat);
        },
        [dateFormat, save],
    );

    const handleDateFormat = useCallback(
        (event: ChangeEvent<HTMLSelectElement>) => {
            const next = event.target.value as DateFormatPreset;
            setDateFormat(next);
            void save(timezone, next);
        },
        [timezone, save],
    );

    // Keep a non-listed saved zone selectable rather than silently blank.
    const timezoneOptions = COMMON_TIMEZONES.includes(timezone)
        ? COMMON_TIMEZONES
        : [timezone, ...COMMON_TIMEZONES];

    return (
        <Section>
            <Section.Header
                title="Message formatting"
                description="How dates and times appear in Telegram notifications. Applies to every message — group posts, assignment DMs, and stale-item alerts."
            />

            <Divider className="py-6" />

            <Section.Body className="gap-6">
                {isLoading ? (
                    <LoadingSpinner className="py-8" />
                ) : (
                    <>
                        <div className="flex flex-col gap-2 max-w-xs">
                            <Label.sm>Time zone</Label.sm>
                            <Select value={timezone} onChange={handleTimezone}>
                                {timezoneOptions.map((tz) => (
                                    <option key={tz} value={tz}>
                                        {tz}
                                    </option>
                                ))}
                            </Select>
                            <Paragraph.xs className="text-quaternary">
                                All times in messages are shown in this zone.
                            </Paragraph.xs>
                        </div>

                        <div className="flex flex-col gap-2 max-w-xs">
                            <Label.sm>Date format</Label.sm>
                            <Select value={dateFormat} onChange={handleDateFormat}>
                                {DATE_FORMAT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label} — {option.example}
                                    </option>
                                ))}
                            </Select>
                            <Paragraph.xs className="text-quaternary">
                                Preview: {formatInstant(PREVIEW_ISO, timezone, dateFormat)}
                            </Paragraph.xs>
                        </div>
                    </>
                )}
            </Section.Body>
        </Section>
    );
}
