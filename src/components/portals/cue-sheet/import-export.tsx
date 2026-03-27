import { useRef } from 'react'
import { Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CueEvent } from '@/types'
import type { Dispatch } from 'react'
import type { CueSheetAction } from './types'

interface ImportExportProps {
  events: CueEvent[]
  dispatch: Dispatch<CueSheetAction>
}

function isValidEvent(obj: unknown): obj is CueEvent {
  if (!obj || typeof obj !== 'object') return false
  const e = obj as Record<string, unknown>
  return (
    typeof e.id === 'string' &&
    typeof e.name === 'string' &&
    typeof e.totalDurationMinutes === 'number' &&
    Array.isArray(e.tracks) &&
    Array.isArray(e.cueItems)
  )
}

function parseImport(raw: string): CueEvent[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      const events = parsed.filter(isValidEvent)
      return events.length > 0 ? events : null
    }
    if (isValidEvent(parsed)) return [parsed]
    return null
  } catch {
    return null
  }
}

export function ImportExport({ events, dispatch }: ImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    const json = JSON.stringify(events, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cue-sheet-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const raw = event.target?.result as string
      const imported = parseImport(raw)
      if (imported) {
        dispatch({
          type: 'IMPORT_JSON',
          data: { events: imported, activeEventId: imported[0]?.id ?? null },
        })
      } else {
        alert('Invalid cue sheet file. Please check the format and try again.')
      }
    }
    reader.readAsText(file)
    // Reset so same file can be re-imported
    e.target.value = ''
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={handleExport}>
        <Download className="mr-1.5 h-3.5 w-3.5" />
        Export JSON
      </Button>
      <Button variant="secondary" size="sm" onClick={handleImportClick}>
        <Upload className="mr-1.5 h-3.5 w-3.5" />
        Import JSON
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
