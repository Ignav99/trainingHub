'use client'

import { useState } from 'react'
import type { CodeButton, CodeEvent } from './types'
import { clipDisplayTitle, groupClipsByButton } from './videoDesk'
import { formatTime } from './utils'

export function VideoDeskFolders({
  buttons,
  events,
  selectedClipId,
  onSelect,
  onPlay,
  onRename,
  onNudge,
  onDownload,
  onSend,
  onDelete,
}: {
  buttons: CodeButton[]
  events: CodeEvent[]
  selectedClipId: string | null
  onSelect: (clip: CodeEvent) => void
  onPlay: (clip: CodeEvent) => void
  onRename: (clip: CodeEvent, title: string) => void
  onNudge: (clip: CodeEvent, edge: 'start' | 'end', delta: number) => void
  onDownload: (clip: CodeEvent) => void
  onSend: (clip: CodeEvent) => void
  onDelete: (clip: CodeEvent) => void
}) {
  const groups = groupClipsByButton(buttons, events)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const keyOf = (label: string, id: string | null) => id || `orphan:${label}`

  if (!events.length) {
    return <p className="vd-empty">Pulsa un botón en el momento. El recorte entra en esa carpeta con los tiempos de ese botón.</p>
  }

  return (
    <div className="vd-folders">
      {groups.map((group) => {
        const key = keyOf(group.label, group.button?.id || null)
        const expanded = open[key] ?? (group.clips.length > 0)
        return (
          <div key={key} className="vd-folder">
            <button
              type="button"
              className="vd-folder-head"
              onClick={() => setOpen((s) => ({ ...s, [key]: !expanded }))}
            >
              <span className="vd-folder-swatch" style={{ background: group.color }} />
              <span>{group.label}</span>
              <span className="vd-folder-count">{group.clips.length}</span>
            </button>
            {expanded
              ? group.clips.map((clip) => {
                  const title = clipDisplayTitle(clip, group.button)
                  const selected = selectedClipId === clip.id
                  return (
                    <div
                      key={clip.id}
                      className={`vd-clip${selected ? ' is-selected' : ''}`}
                      onClick={() => onSelect(clip)}
                    >
                      <input
                        className="vd-clip-title"
                        value={title}
                        onChange={(e) => onRename(clip, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="vd-clip-time">
                        {formatTime(clip.startTime)}–{formatTime(clip.endTime)}
                      </span>
                      <div className="vd-clip-actions">
                        <button type="button" onClick={(e) => { e.stopPropagation(); onPlay(clip) }}>Ver</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); onNudge(clip, 'start', -1) }}>Inicio −1s</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); onNudge(clip, 'start', 1) }}>Inicio +1s</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); onNudge(clip, 'end', -1) }}>Final −1s</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); onNudge(clip, 'end', 1) }}>Final +1s</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); onDownload(clip) }}>Descargar</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); onSend(clip) }}>A revisión</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(clip) }}>Quitar</button>
                      </div>
                    </div>
                  )
                })
              : null}
          </div>
        )
      })}
    </div>
  )
}
