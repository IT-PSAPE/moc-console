import * as React from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createMockReactModule, HookRuntime } from '../../../../../../../broadcast/src/features/test-hook-runtime'
import type { NotificationTemplate } from '../../../../../../../../../apps/console/src/data/notification-templates'

let workspaceId = 'workspace-a'
let templates: NotificationTemplate[] = []
let resourceError: Error | null = null
const mockHooks = createMockReactModule()
vi.doMock('react', () => ({ ...React, ...mockHooks }))
vi.doMock('react-router-dom', () => ({ useBlocker: () => ({ state: 'unblocked', proceed: vi.fn(), reset: vi.fn() }) }))
vi.doMock('../../../../../../../../../apps/console/src/lib/workspace-context', () => ({ useWorkspace: () => ({ currentWorkspaceId: workspaceId }) }))
vi.doMock('@moc/ui/components/feedback/feedback-provider', () => ({ useFeedback: () => ({ toast: vi.fn() }) }))
vi.doMock('../../../../../../../../../apps/console/src/data/notification-templates', () => ({
  fetchNotificationTemplates: vi.fn(),
  upsertNotificationTemplate: vi.fn(),
  deleteNotificationTemplate: vi.fn(),
}))
vi.doMock('../../../../../../../../../apps/console/src/lib/template-editor-html', () => ({ templateHasContent: () => true }))
vi.doMock('../../../../../../../../../apps/console/src/hooks/use-workspace-resource', () => ({
  useWorkspaceResource: () => ({ data: templates, hasData: templates.length > 0, error: resourceError, isLoading: false, load: vi.fn(), updateData: (updater: (rows: NotificationTemplate[]) => NotificationTemplate[]) => { templates = updater(templates) } }),
}))
vi.doMock('../../../../../../../../../apps/console/src/hooks/use-template-body-editor', () => ({
  useTemplateBodyEditor: (body: string, onChange: (body: string) => void) => ({
    state: { editorHtml: body, unsupportedTags: [] },
    actions: { changeBody: onChange, changeRichBody: onChange, insertTokenFromButton: vi.fn() },
    meta: { textareaRef: { current: null } },
  }),
}))

const { useMessageTemplateEditor } = await import('../../../../../../../../../apps/console/src/screens/account/settings/message-templates/detail/use-message-template-editor')

beforeEach(() => {
  workspaceId = 'workspace-a'
  resourceError = null
  templates = [{ workspaceId, messageType: 'request.created', body: 'Saved body', scope: 'group' } as NotificationTemplate]
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() })
})
afterEach(() => { vi.unstubAllGlobals() })

test('a cached server refresh does not replace a dirty local template draft', () => {
  const runtime = new HookRuntime(useMessageTemplateEditor)
  runtime.render('request.created')
  runtime.rerender().actions.changeBody('My unsaved draft')

  templates = [{ workspaceId, messageType: 'request.created', body: 'Fresh server body', scope: 'group' } as NotificationTemplate]

  expect(runtime.rerender().state.body).toBe('My unsaved draft')
  expect(runtime.result?.state.dirty).toBe(true)
  runtime.unmount()
})

test('a background refresh error leaves a cached dirty draft editable', () => {
  const runtime = new HookRuntime(useMessageTemplateEditor)
  runtime.render('request.created')
  runtime.rerender().actions.changeBody('My unsaved draft')
  resourceError = new Error('Refresh failed')

  const result = runtime.rerender()
  expect(result.state.loadError).toBeNull()
  expect(result.state.body).toBe('My unsaved draft')
  expect(result.state.dirty).toBe(true)
  expect(result.state.canSave).toBe(true)
  runtime.unmount()
})
