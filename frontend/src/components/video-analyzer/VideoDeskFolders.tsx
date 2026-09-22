'use client'

import type { CodeButton, CodeEvent } from './types'
import { clipDisplayTitle, groupClipsByButton } from './videoDesk'
import { formatTime } from './utils'

export function VideoDeskFolders({
  buttons,
  events,
  selectedClipId,
  selectedLaneId,
  onPlayClip,
  onPlayLane,
}: {
  buttons: CodeButton[]
  events: CodeEvent[]
  selectedClipId: string | null
  selectedLaneId: string | null
  onPlayClip: (clip: CodeEvent) => void
  onPlayLane: (buttonId: string) => void
}) {
  const groups = groupClipsByButton(buttons, events)

  if (!events.length) {
    return <p className="vd-empty">Pulsa un botón en el momento. El recorte entra en esa línea.</p>
  }

  return (
    <div className="vd-folders vd-folders-slim">
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
            {group.clips.slice(0, 8).map((clip) => (
              <button
                key={clip.id}
                type="button"
                className={`vd-clip-mini${selectedClipId === clip.id ? ' is-selected' : ''}`}
                onClick={() => onPlayClip(clip)}
              >
                <span className="vd-clip-title">{clipDisplayTitle(clip, group.button)}</span>
                <span className="vd-clip-time">{formatTime(clip.startTime)}</span>
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}
