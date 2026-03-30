import { ModalBackdrop } from './modal-backdrop'
import { ModalBody as ModalContent } from './modal-body'
import { ModalClose } from './modal-close'
import { ModalFooter } from './modal-footer'
import { ModalHeader } from './modal-header'
import { ModalPanel } from './modal-panel'
import { ModalPortal } from './modal-portal'
import { ModalPositioner } from './modal-positioner'
import { ModalRoot } from './modal-root'
import { ModalTrigger } from './modal-trigger'

export { OverlayProvider } from './overlay-provider'
export { useModal } from './modal-context'

export const Modal = {
    Root: ModalRoot,
    Trigger: ModalTrigger,
    Portal: ModalPortal,
    Backdrop: ModalBackdrop,
    Positioner: ModalPositioner,
    Panel: ModalPanel,
    Header: ModalHeader,
    Content: ModalContent,
    Footer: ModalFooter,
    Close: ModalClose,
}
