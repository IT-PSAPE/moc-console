import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { BookingHistorySection } from "@/features/equipment/booking-history-section"
import { DeleteEquipmentModal } from "@/features/equipment/delete-equipment-modal"
import { EquipmentNotesSection } from "@/features/equipment/equipment-notes-section"
import { EquipmentPropertiesSection } from "@/features/equipment/equipment-properties-section"
import { EquipmentQrSection } from "@/features/equipment/equipment-qr-section"
import { useEquipmentEditor } from "@/features/equipment/use-equipment-editor"
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal"
import { TopBarActions } from "@/features/topbar"
import { useUnsavedNavigationGuard } from "@/hooks/use-unsaved-navigation-guard"
import { Button } from "@moc/ui/components/controls/button"
import { Header } from "@moc/ui/components/display/header"
import { Paragraph } from "@moc/ui/components/display/text"
import { DetailPage } from "@moc/ui/components/layout/detail-page"
import { Page } from "@moc/ui/components/layout/page"
import type { Equipment } from "@moc/types/equipment"
import { Package, Save, Trash2, Undo2 } from "lucide-react"

export function EquipmentDetailContent({ equipment }: { equipment: Equipment }) {
  const navigate = useNavigate()
  const handleDeleted = useCallback(() => navigate("/equipment"), [navigate])
  const editor = useEquipmentEditor(equipment, handleDeleted)
  const { store, bookingHistory } = editor
  const guard = useUnsavedNavigationGuard({ isDirty: store.state.isDirty, save: editor.actions.save, discard: store.actions.discard })
  const draft = store.state.draft

  function openDelete() {
    editor.actions.setDeleteOpen(true)
  }

  function closeDelete() {
    editor.actions.setDeleteOpen(false)
  }

  return (
    <DetailPage>
        <TopBarActions>
          {store.state.isDirty && (
            <>
              <Button variant="ghost" icon={<Undo2 />} onClick={store.actions.discard}>Discard</Button>
              <Button icon={<Save />} onClick={editor.actions.save} disabled={store.state.isSaving}>{store.state.isSaving ? "Saving…" : "Save"}</Button>
            </>
          )}
          <Button.Icon aria-label="Delete equipment" variant="danger-secondary" icon={<Trash2 />} onClick={openDelete} />
        </TopBarActions>

        <DetailPage.Header>
          <Header.Lead className="gap-3">
            {draft.thumbnail ? (
              <img src={draft.thumbnail} alt={draft.name} width="56" height="56" className="size-14 rounded-lg object-cover" />
            ) : (
              <span className="flex size-14 items-center justify-center rounded-lg bg-secondary text-quaternary"><Package className="size-7" /></span>
            )}
            <div>
              <Page.Title>{draft.name}</Page.Title>
              <Paragraph.sm className="text-tertiary">{draft.serialNumber}</Paragraph.sm>
            </div>
          </Header.Lead>
        </DetailPage.Header>

        <div className="py-4"><EquipmentPropertiesSection draft={draft} onUpdateField={store.actions.updateField} /></div>
        <DetailPage.Divider />
        <div className="py-4"><EquipmentNotesSection draft={draft} onUpdateField={store.actions.updateField} /></div>
        <DetailPage.Divider />
        <div className="py-4"><BookingHistorySection bookings={bookingHistory.state.bookings} isLoading={bookingHistory.state.isLoading} /></div>
        <DetailPage.Divider />
        <div className="py-4"><EquipmentQrSection equipment={draft} /></div>

        <UnsavedChangesModal open={guard.state.isBlocked} onSave={guard.actions.saveAndContinue} onDiscard={guard.actions.discardAndContinue} onCancel={guard.actions.cancel} isSaving={store.state.isSaving} />
        <DeleteEquipmentModal open={editor.state.deleteOpen} onDelete={editor.actions.remove} onCancel={closeDelete} isDeleting={editor.state.isDeleting} />
    </DetailPage>
  )
}
