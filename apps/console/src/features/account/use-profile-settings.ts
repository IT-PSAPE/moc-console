import { removeUserAvatar, updateUserProfile, uploadUserAvatar } from "@/data/fetch-users"
import { useAuth } from "@/lib/auth-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { useEffect, useRef, useState, type ChangeEvent } from "react"

export const PROFILE_STATUS_MAX_LENGTH = 500

type UseProfileSettingsProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function useProfileSettings({ open, onOpenChange }: UseProfileSettingsProps) {
  const { profile, refreshProfile } = useAuth()
  const { toast } = useFeedback()
  const [name, setName] = useState("")
  const [surname, setSurname] = useState("")
  const [duty, setDuty] = useState("")
  const [status, setStatus] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [removeAvatarOpen, setRemoveAvatarOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || !profile) return
    setName(profile.name)
    setSurname(profile.surname)
    setDuty(profile.currentDuty ?? "")
    setStatus(profile.statusMessage ?? "")
  }, [open, profile])

  const trimmedName = name.trim()
  const trimmedSurname = surname.trim()
  const trimmedDuty = duty.trim()
  const trimmedStatus = status.trim()
  const hasChanges = profile
    ? trimmedName !== profile.name
      || trimmedSurname !== profile.surname
      || trimmedDuty !== (profile.currentDuty ?? "")
      || trimmedStatus !== (profile.statusMessage ?? "")
    : false
  const canSave = Boolean(
    profile
    && hasChanges
    && trimmedName.length > 0
    && trimmedSurname.length > 0
    && trimmedStatus.length <= PROFILE_STATUS_MAX_LENGTH
    && !isSaving,
  )

  function reset() {
    if (!profile) return
    setName(profile.name)
    setSurname(profile.surname)
    setDuty(profile.currentDuty ?? "")
    setStatus(profile.statusMessage ?? "")
  }

  function close() {
    reset()
    onOpenChange(false)
  }

  async function save() {
    if (!profile || !canSave) return
    setIsSaving(true)
    try {
      await updateUserProfile(profile.id, {
        name: trimmedName,
        surname: trimmedSurname,
        current_duty: trimmedDuty || null,
        status_message: trimmedStatus || null,
      })
      await refreshProfile()
      toast({ title: "Profile updated", variant: "success" })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: "Could not update profile",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      })
    } finally {
      setIsSaving(false)
    }
  }

  function pickAvatar() {
    fileInputRef.current?.click()
  }

  function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    event.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast({ title: "Pick an image file", variant: "error" })
      return
    }
    setPendingAvatarFile(file)
  }

  async function uploadAvatar(blob: Blob) {
    if (!profile) return
    setIsUploadingAvatar(true)
    try {
      await uploadUserAvatar(profile.id, blob)
      await refreshProfile()
      toast({ title: "Photo updated", variant: "success" })
      setPendingAvatarFile(null)
    } catch (error) {
      toast({
        title: "Could not upload photo",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  async function removeAvatar() {
    if (!profile) return
    setIsUploadingAvatar(true)
    try {
      await removeUserAvatar(profile.id)
      await refreshProfile()
      toast({ title: "Photo removed", variant: "success" })
      setRemoveAvatarOpen(false)
    } catch (error) {
      toast({
        title: "Could not remove photo",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  function openRemoveAvatar() {
    setRemoveAvatarOpen(true)
  }

  function closeRemoveAvatar() {
    setRemoveAvatarOpen(false)
  }

  function cancelAvatarCrop() {
    setPendingAvatarFile(null)
  }

  return {
    state: { name, surname, duty, status, isSaving, pendingAvatarFile, isUploadingAvatar, removeAvatarOpen },
    actions: { setName, setSurname, setDuty, setStatus, close, save, pickAvatar, selectAvatar, uploadAvatar, removeAvatar, openRemoveAvatar, closeRemoveAvatar, cancelAvatarCrop },
    fileInputRef,
    meta: {
      profile,
      canSave,
      initials: profile ? `${profile.name[0] ?? ""}${profile.surname[0] ?? ""}` : "",
      statusLength: trimmedStatus.length,
    },
  }
}
