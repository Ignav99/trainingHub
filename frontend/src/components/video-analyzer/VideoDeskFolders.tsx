'use client'

import { useState } from 'react'
import { Pencil, Play, Trash2 } from 'lucide-react'
import type { CodeButton, CodeEvent } from './types'
import { clipDisplayTitle, groupClipsByButton } from './videoDesk'
import { formatTime } from './utils'

export function VideoDeskFolders({
  buttons,
  events,
  selectedClipId,
  selectedClipIds = [],
  selectedLaneId,
  onSelectClip,
  onPlayClip,
  onPlayLane,
  onDeleteClip,
  onRenameClip,
}: {
  buttons: CodeButton[]
  events: CodeEvent[]
  selectedClipId: string | null
  selectedClipIds?: string[]
  selectedLaneId: string | null
  onSelectClip: (clip: CodeEvent, opts?: { toggle?: boolean }) => void
  onPlayClip: (clip: CodeEvent) => void
  onPlayLane: (buttonId: string) => void
  onDeleteClip: (clip: CodeEvent) => void
  onRenameClip: (clip: CodeEvent, title: string) => void
}) {
  const groups = groupClipsByButton(buttons, events)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const startRename = (clip: CodeEvent, button?: CodeButton | null) => {
    setEditingId(clip.id)
    setDraft(clip.title?.trim() || clipDisplayTitle(clip, button))
  }

  const commitRename = (clip: CodeEvent) => {
    const next = draft.trim()
    setEditingId(null)
    if (next) onRenameClip(clip, next)
  }

  if (!events.length) {
    return (
      <p className="vd-empty">
        Pulsa un botón en el momento. El recorte entra aquí; dale un nombre de fase o el que quieras.
      </p>
    )
  }

  return (
    <div className="vd-folders vd-organizer">
      {groups.map((group) => {
        const key = group.button?.id || `orphan:${group.label}`
        return (
          <div key={key} className="vd-folder">
            <button
              type="button"
              className={`vd-folder-head${selectedLaneId && selectedLaneId === group.button?.id ? ' is-selected' : ''}`}
              onClick={() => group.button && onPlayLane(group.button.id)}
              title={group.button ? `Reproducir ${group.clips.length} recortes de ${group.label}` : group.label}
            >
              <span className="vd-folder-swatch" style={{ background: group.color }} />
              <span>{group.label}</span>
              <span className="vd-folder-count">{group.clips.length}</span>
            </button>
            {group.clips.map((clip) => {
              const selected = selectedClipIds.includes(clip.id) || selectedClipId === clip.id
              const editing = editingId === clip.id
              const nameInput = (
                <input
                  className="vd-clip-name-input"
                  value={draft}
                  autoFocus
                  aria-label="Nombre del recorte"
                  placeholder={group.label}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commitRename(clip)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitRename(clip)
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      setEditingId(null)
                    }
                  }}
                />
              )
              return (
                <div key={clip.id} className={`vd-clip-row${selected ? ' is-selected' : ''}`}>
                  {editing ? (
                    <div className="vd-clip-mini">
                      {nameInput}
                      <span className="vd-clip-time">{formatTime(clip.startTime)}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="vd-clip-mini"
                      title="Clic selecciona · ⌘ o Ctrl+clic añade varios para revisión · doble clic renombra"
                      onClick={(e) => onSelectClip(clip, { toggle: e.metaKey || e.ctrlKey })}
                      onDoubleClick={(e) => {
                        e.preventDefault()
                        startRename(clip, group.button)
                      }}
                    >
                      <span className="vd-clip-title">{clipDisplayTitle(clip, group.button)}</span>
                      <span className="vd-clip-time">{formatTime(clip.startTime)}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="vd-clip-act"
                    aria-label="Reproducir recorte"
                    title="Reproducir"
                    onClick={(e) => {
                      e.stopPropagation()
                      onPlayClip(clip)
                    }}
                  >
                    <Play size={12} />
                  </button>
                  <button
                    type="button"
                    className="vd-clip-act"
                    aria-label="Renombrar recorte"
                    title="Renombrar"
                    onClick={(e) => {
                      e.stopPropagation()
                      startRename(clip, group.button)
                    }}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    className="vd-clip-delete"
                    aria-label={`Eliminar ${clipDisplayTitle(clip, group.button)}`}
                    title="Eliminar recorte"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteClip(clip)
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
