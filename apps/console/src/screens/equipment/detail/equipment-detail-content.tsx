import { ItemDiscussionPanel } from "@/features/item-discussion/item-discussion-panel"
import { useDetailReturn } from "@/hooks/use-detail-return"
import { useCallback } from "react"
import { Link, useNavigate } from "react-router-dom"
import { DeleteEquipmentModal } from "@/features/equipment/delete-equipment-modal"
import { EquipmentPropertiesSection } from "@/features/equipment/equipment-properties-section"
import { EquipmentQrSection } from "@/features/equipment/equipment-qr-section"
import { EquipmentThumbnail } from "@/features/equipment/equipment-thumbnail"
import { useEquipmentEditor } from "@/features/equipment/use-equipment-editor"
import { UnsavedChangesModal } from "@/features/requests/unsaved-changes-modal"
import { TopBarActions } from "@/features/topbar"
import { useUnsavedNavigationGuard } from "@/hooks/use-unsaved-navigation-guard"
import { routes } from "@/screens/console-routes"
import { Button } from "@moc/ui/components/controls/button"
import { Header } from "@moc/ui/components/display/header"
import { Paragraph } from "@moc/ui/components/display/text"
import { DetailPage } from "@moc/ui/components/layout/detail-page"
import { Page } from "@moc/ui/components/layout/page"
import type { Equipment } from "@moc/types/equipment"
import { Save, Trash2, Undo2 } from "lucide-react"

export function EquipmentDetailContent({ equipment }: { equipment: Equipment }) {
  const back = useDetailReturn(`/${routes.equipment}`, "Back to equipment")
  const navigate = useNavigate()
  const handleDeleted = useCallback(() => navigate("/equipment"), [navigate])
  const editor = useEquipmentEditor(equipment, handleDeleted)
  const { store } = editor
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
        <DetailPage.Back render={<Link to={back.href} />}>{back.label}</DetailPage.Back>
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
            <EquipmentThumbnail equipment={draft} size="lg" />
            <div>
              <Page.Title>{draft.name}</Page.Title>
              <Paragraph.sm className="text-tertiary">{draft.serialNumber}</Paragraph.sm>
            </div>
          </Header.Lead>
        </DetailPage.Header>

        <DetailPage.Section><EquipmentPropertiesSection draft={draft} onUpdateField={store.actions.updateField} /></DetailPage.Section>
        <DetailPage.Divider />
        <DetailPage.Section><EquipmentQrSection equipment={draft} /></DetailPage.Section>
        <DetailPage.Divider />
        <DetailPage.Section><ItemDiscussionPanel kind="equipment" itemId={equipment.id} /></DetailPage.Section>

        <UnsavedChangesModal open={guard.state.isBlocked} onSave={guard.actions.saveAndContinue} onDiscard={guard.actions.discardAndContinue} onCancel={guard.actions.cancel} isSaving={store.state.isSaving} />
        <DeleteEquipmentModal open={editor.state.deleteOpen} onDelete={editor.actions.remove} onCancel={closeDelete} isDeleting={editor.state.isDeleting} />
    </DetailPage>
  )
}
