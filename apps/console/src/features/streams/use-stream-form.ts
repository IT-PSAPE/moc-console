import { fetchCategories, fetchPlaylists } from "@/data/fetch-streams";
import type { ThumbnailSource } from "@/data/mutate-streams";
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider";
import type { NotifyDestination } from "@moc/types/streams";
import type { LatencyPreference, Stream, StreamPreset, StreamPrivacy, YouTubeCategory, YouTubePlaylist } from "@moc/types/streams/stream";
import { fetchImageBlob, UNFETCHABLE_THUMBNAIL_MESSAGE } from "@moc/utils/blob-fetch";
import { formatUtcIsoForDateTimeInput, parseDateTimeInputToUtcIso } from "@moc/utils/zoned-date-time";
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import type { ThumbnailStatus } from "./stream-thumbnail-field";

export type StreamFormData = {
  title: string;
  description: string;
  privacyStatus: StreamPrivacy;
  isForKids: boolean;
  scheduledStartTime: string | null;
  categoryId: string | null;
  tags: string[];
  latencyPreference: LatencyPreference;
  enableDvr: boolean;
  enableEmbed: boolean;
  enableAutoStart: boolean;
  enableAutoStop: boolean;
  playlistId: string | null;
  thumbnail: ThumbnailSource;
  notifyDestinations: NotifyDestination[];
  savePreset: boolean;
};

type ThumbSelection =
  | { kind: "file"; file: File }
  | { kind: "url"; url: string }
  | null;

type UseStreamFormOptions = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (params: StreamFormData) => Promise<void> | void;
  stream?: Stream | null;
  preset?: StreamPreset | null;
};

function fileNameFromUrl(url: string, fallback: string) {
  return url.split("/").pop() || fallback;
}

export function useStreamForm({ open, onOpenChange, onSubmit, stream, preset }: UseStreamFormOptions) {
  const isEditing = Boolean(stream);
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { toast } = useFeedback();
  const seed = stream ?? preset ?? null;
  const seedScheduledStart = stream ? stream.scheduledStartTime : preset?.scheduledStartTime ?? null;
  const presetThumbnailUrl = !isEditing ? preset?.thumbnailUrl ?? null : null;

  const [title, setTitle] = useState(seed?.title ?? "");
  const [description, setDescription] = useState(seed?.description ?? "");
  const [privacyStatus, setPrivacyStatus] = useState<StreamPrivacy>(seed?.privacyStatus ?? "unlisted");
  const [isForKids, setIsForKids] = useState(seed?.isForKids ?? false);
  const [scheduledStartTime, setScheduledStartTime] = useState(
    seedScheduledStart ? formatUtcIsoForDateTimeInput(seedScheduledStart, browserTimeZone) : "",
  );
  const [savePreset, setSavePreset] = useState(false);
  const [notifyDestinations, setNotifyDestinations] = useState<NotifyDestination[]>([]);
  const [thumbSelection, setThumbSelection] = useState<ThumbSelection>(
    presetThumbnailUrl ? { kind: "url", url: presetThumbnailUrl } : null,
  );
  const [thumbName, setThumbName] = useState<string | undefined>(
    presetThumbnailUrl ? fileNameFromUrl(presetThumbnailUrl, "Preset thumbnail") : undefined,
  );
  const [thumbBlob, setThumbBlob] = useState<Blob | null>(null);
  const [thumbStatus, setThumbStatus] = useState<ThumbnailStatus>("idle");
  const [thumbError, setThumbError] = useState<string | null>(null);
  const [thumbPreviewUrl, setThumbPreviewUrl] = useState<string | null>(null);
  const [thumbnailUrlInput, setThumbnailUrlInput] = useState("");
  const [thumbnailMode, setThumbnailMode] = useState<"file" | "url">("file");
  const [categoryId, setCategoryId] = useState<string | null>(seed?.categoryId ?? null);
  const [tags, setTags] = useState<string[]>(seed?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [playlistId, setPlaylistId] = useState<string | null>(seed?.playlistId ?? null);
  const [latencyPreference, setLatencyPreference] = useState<LatencyPreference>(seed?.latencyPreference ?? "normal");
  const [enableDvr, setEnableDvr] = useState(seed?.enableDvr ?? true);
  const [enableEmbed, setEnableEmbed] = useState(seed?.enableEmbed ?? true);
  const [enableAutoStart, setEnableAutoStart] = useState(seed?.enableAutoStart ?? false);
  const [enableAutoStop, setEnableAutoStop] = useState(seed?.enableAutoStop ?? true);
  const [categories, setCategories] = useState<YouTubeCategory[]>([]);
  const [playlists, setPlaylists] = useState<YouTubePlaylist[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resolveSeqRef = useRef(0);
  const thumbReady = !thumbSelection || (thumbStatus === "ready" && thumbBlob !== null);
  const canSubmit = Boolean(title.trim()) && !isSubmitting && thumbReady;

  function resetForm() {
    const reset = stream ?? preset ?? null;
    const resetScheduledStart = stream ? stream.scheduledStartTime : preset?.scheduledStartTime ?? null;
    const resetPresetThumbUrl = !stream ? preset?.thumbnailUrl ?? null : null;
    setTitle(reset?.title ?? "");
    setDescription(reset?.description ?? "");
    setPrivacyStatus(reset?.privacyStatus ?? "unlisted");
    setIsForKids(reset?.isForKids ?? false);
    setScheduledStartTime(resetScheduledStart ? formatUtcIsoForDateTimeInput(resetScheduledStart, browserTimeZone) : "");
    setThumbSelection(resetPresetThumbUrl ? { kind: "url", url: resetPresetThumbUrl } : null);
    setThumbName(resetPresetThumbUrl ? fileNameFromUrl(resetPresetThumbUrl, "Preset thumbnail") : undefined);
    setThumbnailUrlInput("");
    setThumbnailMode("file");
    setCategoryId(reset?.categoryId ?? null);
    setTags(reset?.tags ?? []);
    setTagInput("");
    setPlaylistId(reset?.playlistId ?? null);
    setLatencyPreference(reset?.latencyPreference ?? "normal");
    setEnableDvr(reset?.enableDvr ?? true);
    setEnableEmbed(reset?.enableEmbed ?? true);
    setEnableAutoStart(reset?.enableAutoStart ?? false);
    setEnableAutoStop(reset?.enableAutoStop ?? true);
    setSavePreset(false);
    setNotifyDestinations([]);
  }

  useEffect(() => {
    if (!open) return;
    const failures: string[] = [];
    void Promise.all([
      fetchCategories().then(setCategories).catch((error: unknown) => {
        console.error("Failed to load YouTube categories", error);
        failures.push("categories");
      }),
      fetchPlaylists().then(setPlaylists).catch((error: unknown) => {
        console.error("Failed to load YouTube playlists", error);
        failures.push("playlists");
      }),
    ]).then(() => {
      if (failures.length === 0) return;
      toast({
        title: "Some options could not be loaded",
        description: `Failed to load ${failures.join(", ")}. Try reopening the modal.`,
        variant: "error",
      });
    });
  }, [open, toast]);

  useEffect(() => {
    if (!open) return;
    resetForm();
    // Re-seed only when the modal opens; other dependencies would wipe in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (latencyPreference === "ultraLow") setEnableDvr(false);
  }, [latencyPreference]);

  useEffect(() => {
    const selection = thumbSelection;
    if (!selection) {
      setThumbBlob(null);
      setThumbStatus("idle");
      setThumbError(null);
      setThumbPreviewUrl(null);
      return;
    }

    const sequence = ++resolveSeqRef.current;
    if (selection.kind === "file") {
      const objectUrl = URL.createObjectURL(selection.file);
      setThumbBlob(selection.file);
      setThumbStatus("ready");
      setThumbError(null);
      setThumbPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    setThumbStatus("resolving");
    setThumbError(null);
    setThumbBlob(null);
    setThumbPreviewUrl(null);
    let objectUrl: string | null = null;
    fetchImageBlob(selection.url)
      .then((blob) => {
        if (resolveSeqRef.current !== sequence) return;
        objectUrl = URL.createObjectURL(blob);
        setThumbBlob(blob);
        setThumbStatus("ready");
        setThumbPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (resolveSeqRef.current !== sequence) return;
        setThumbBlob(null);
        setThumbStatus("error");
        setThumbError(UNFETCHABLE_THUMBNAIL_MESSAGE);
        setThumbPreviewUrl(null);
      });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [thumbSelection]);

  function handleModalOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) resetForm();
  }

  function handleFileSelect(file: File | null) {
    if (!file) {
      clearThumbnail();
      return;
    }
    setThumbSelection({ kind: "file", file });
    setThumbName(file.name);
  }

  function handleThumbnailUrlConfirm() {
    const url = thumbnailUrlInput.trim();
    if (!url) return;
    setThumbSelection({ kind: "url", url });
    setThumbName(fileNameFromUrl(url, "Image from URL"));
  }

  function clearThumbnail() {
    setThumbSelection(null);
    setThumbName(undefined);
    setThumbnailUrlInput("");
  }

  function handleAddTag(value: string) {
    const tag = value.trim();
    if (!tag || tags.includes(tag)) return;
    setTags((current) => [...current, tag]);
    setTagInput("");
  }

  function handleRemoveTag(tag: string) {
    setTags((current) => current.filter((currentTag) => currentTag !== tag));
  }

  function handleTagInputBlur() {
    handleAddTag(tagInput);
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      handleAddTag(tagInput);
    } else if (event.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags((current) => current.slice(0, -1));
    }
  }

  function handleSavePresetChange(event: ChangeEvent<HTMLInputElement>) {
    setSavePreset(event.target.checked);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    const thumbnail: ThumbnailSource = thumbSelection && thumbBlob && thumbStatus === "ready"
      ? { blob: thumbBlob, origin: thumbSelection.kind, sourceUrl: thumbSelection.kind === "file" ? null : thumbSelection.url }
      : null;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(), description: description.trim(), privacyStatus, isForKids,
        scheduledStartTime: scheduledStartTime ? parseDateTimeInputToUtcIso(scheduledStartTime, browserTimeZone) : null,
        categoryId, tags, latencyPreference, enableDvr, enableEmbed, enableAutoStart, enableAutoStop,
        playlistId, savePreset, thumbnail, notifyDestinations,
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    state: {
      title, description, privacyStatus, isForKids, scheduledStartTime, savePreset, notifyDestinations,
      thumbSelection, thumbName, thumbStatus, thumbError, thumbPreviewUrl, thumbnailUrlInput, thumbnailMode,
      categoryId, tags, tagInput, playlistId, latencyPreference, enableDvr, enableEmbed, enableAutoStart,
      enableAutoStop, categories, playlists, isSubmitting,
    },
    actions: {
      setTitle, setDescription, setPrivacyStatus, setIsForKids, setScheduledStartTime, setNotifyDestinations,
      setThumbnailUrlInput, setThumbnailMode, setCategoryId, setTagInput, setPlaylistId, setLatencyPreference,
      setEnableDvr, setEnableEmbed, setEnableAutoStart, setEnableAutoStop, handleModalOpenChange, handleFileSelect,
      handleThumbnailUrlConfirm, clearThumbnail, handleRemoveTag, handleTagInputBlur, handleTagKeyDown,
      handleSavePresetChange, handleSubmit,
    },
    meta: { isEditing, canSubmit, stream },
  };
}
