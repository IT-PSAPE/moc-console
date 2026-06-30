import { Section } from "@moc/ui/components/display/section";
import { Divider } from "@moc/ui/components/display/divider";
import { SettingsRow } from "@moc/ui/components/display/settings-row";
import { Input } from "@moc/ui/components/form/input";
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import { useWorkspace } from "@/lib/workspace-context";
import {
    DEFAULT_AUTO_ARCHIVE_COMPLETED_REQUESTS_DAYS,
    DEFAULT_AUTO_ARCHIVE_RETURNED_BOOKINGS_DAYS,
    fetchNotificationSettings,
    updateAutoArchiveDays,
} from "@/data/notification-settings";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error";
}

function parsePositiveInteger(value: string): number | null {
    const days = Number.parseInt(value, 10);
    return Number.isInteger(days) && days > 0 ? days : null;
}

export function ArchiveAutomationsSection() {
    const { toast } = useFeedback();
    const { currentWorkspaceId } = useWorkspace();

    const [requestDaysInput, setRequestDaysInput] = useState(String(DEFAULT_AUTO_ARCHIVE_COMPLETED_REQUESTS_DAYS));
    const [bookingDaysInput, setBookingDaysInput] = useState(String(DEFAULT_AUTO_ARCHIVE_RETURNED_BOOKINGS_DAYS));
    const [savedRequestDays, setSavedRequestDays] = useState(DEFAULT_AUTO_ARCHIVE_COMPLETED_REQUESTS_DAYS);
    const [savedBookingDays, setSavedBookingDays] = useState(DEFAULT_AUTO_ARCHIVE_RETURNED_BOOKINGS_DAYS);
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async () => {
        if (!currentWorkspaceId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const settings = await fetchNotificationSettings(currentWorkspaceId);
            setSavedRequestDays(settings.autoArchiveCompletedRequestsDays);
            setSavedBookingDays(settings.autoArchiveReturnedBookingsDays);
            setRequestDaysInput(String(settings.autoArchiveCompletedRequestsDays));
            setBookingDaysInput(String(settings.autoArchiveReturnedBookingsDays));
        } catch (error) {
            toast({
                title: "Couldn't load archive automations",
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
        async (nextRequestDays: number, nextBookingDays: number) => {
            if (!currentWorkspaceId) return;
            try {
                await updateAutoArchiveDays(currentWorkspaceId, nextRequestDays, nextBookingDays);
                setSavedRequestDays(nextRequestDays);
                setSavedBookingDays(nextBookingDays);
                toast({ title: "Archive automations updated", variant: "success" });
            } catch (error) {
                setRequestDaysInput(String(savedRequestDays));
                setBookingDaysInput(String(savedBookingDays));
                toast({
                    title: "Couldn't update archive automations",
                    description: errorMessage(error),
                    variant: "error",
                });
            }
        },
        [currentWorkspaceId, savedBookingDays, savedRequestDays, toast],
    );

    const handleRequestDaysChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setRequestDaysInput(event.target.value);
    }, []);

    const handleBookingDaysChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setBookingDaysInput(event.target.value);
    }, []);

    const handleRequestDaysBlur = useCallback(async () => {
        const nextRequestDays = parsePositiveInteger(requestDaysInput);
        if (nextRequestDays === null) {
            setRequestDaysInput(String(savedRequestDays));
            return;
        }
        if (nextRequestDays === savedRequestDays) return;
        await save(nextRequestDays, savedBookingDays);
    }, [requestDaysInput, save, savedBookingDays, savedRequestDays]);

    const handleBookingDaysBlur = useCallback(async () => {
        const nextBookingDays = parsePositiveInteger(bookingDaysInput);
        if (nextBookingDays === null) {
            setBookingDaysInput(String(savedBookingDays));
            return;
        }
        if (nextBookingDays === savedBookingDays) return;
        await save(savedRequestDays, nextBookingDays);
    }, [bookingDaysInput, save, savedBookingDays, savedRequestDays]);

    return (
        <Section>
            <Section.Header
                title="Auto-archive"
                description="Move finished work out of active views after it has stayed complete or returned for the configured number of days."
            />

            <Divider className="py-6" />

            <Section.Body>
                {isLoading ? (
                    <LoadingSpinner className="py-8" />
                ) : (
                    <>
                        <SettingsRow
                            label="Completed requests"
                            description="Archive requests after they have remained completed for this many days."
                        >
                            <Input
                                type="number"
                                min={1}
                                value={requestDaysInput}
                                onChange={handleRequestDaysChange}
                                onBlur={handleRequestDaysBlur}
                                className="max-w-32"
                            />
                        </SettingsRow>

                        <Divider className="py-6" />

                        <SettingsRow
                            label="Returned bookings"
                            description="Archive equipment bookings after they have remained returned for this many days."
                        >
                            <Input
                                type="number"
                                min={1}
                                value={bookingDaysInput}
                                onChange={handleBookingDaysChange}
                                onBlur={handleBookingDaysBlur}
                                className="max-w-32"
                            />
                        </SettingsRow>
                    </>
                )}
            </Section.Body>
        </Section>
    );
}
