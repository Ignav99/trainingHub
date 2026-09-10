'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Folder } from 'lucide-react'
import type { RevisionClip, RevisionFolder, RevisionPack } from '@/lib/api/revision'
import { clipPlaySrc } from '@/lib/api/revision'

export function clipsInFolder(
  pack: RevisionPack,
  folderId: string,
): RevisionClip[] {
  const ids = new Set(
    (pack.links || [])
      .filter((l) => l.folder_id === folderId)
      .map((l) => l.clip_id),
  )
  return pack.clips.filter((c) => ids.has(c.id) && c.status === 'hot' && clipPlaySrc(c))
}

export function unfiledClips(pack: RevisionPack): RevisionClip[] {
  const linked = new Set((pack.links || []).map((l) => l.clip_id))
  return pack.clips.filter((c) => !linked.has(c.id) && c.status === 'hot' && clipPlaySrc(c))
}

export function SalaClipTree({
  pack,
  currentClipId,
  onPick,
}: {
  pack: RevisionPack
  currentClipId?: string | null
  onPick: (clip: RevisionClip) => void
}) {
  const roots = useMemo(
    () => (pack.folders || []).filter((f) => !f.parent_id).sort((a, b) => a.orden - b.orden),
    [pack.folders],
  )
  const loose = useMemo(() => unfiledClips(pack), [pack])

  return (
    <div className="space-y-1">
      {roots.map((folder) => (
        <SalaFolderNode
          key={folder.id}
          folder={folder}
          pack={pack}
          currentClipId={currentClipId}
          onPick={onPick}
        />
      ))}
      {loose.map((clip) => (
        <ClipButton key={clip.id} clip={clip} active={clip.id === currentClipId} onPick={onPick} />
      ))}
    </div>
  )
}

function SalaFolderNode({
  folder,
  pack,
  currentClipId,
  onPick,
  depth = 0,
}: {
  folder: RevisionFolder
  pack: RevisionPack
  currentClipId?: string | null
  onPick: (clip: RevisionClip) => void
  depth?: number
}) {
  const [open, setOpen] = useState(true)
  const kids = (pack.folders || [])
    .filter((f) => f.parent_id === folder.id)
    .sort((a, b) => a.orden - b.orden)
  const clips = clipsInFolder(pack, folder.id)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-zinc-300 hover:bg-white/10"
        style={{ paddingLeft: 6 + depth * 10 }}
      >
        {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        <Folder className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        <span className="truncate text-left">{folder.nombre}</span>
        <span className="ml-auto text-[10px] text-zinc-500">{clips.length}</span>
      </button>
      {open && (
        <div>
          {kids.map((k) => (
            <SalaFolderNode
              key={k.id}
              folder={k}
              pack={pack}
              currentClipId={currentClipId}
              onPick={onPick}
              depth={depth + 1}
            />
          ))}
          {clips.map((clip) => (
            <ClipButton
              key={clip.id}
              clip={clip}
              active={clip.id === currentClipId}
              onPick={onPick}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ClipButton({
  clip,
  active,
  onPick,
  depth = 0,
}: {
  clip: RevisionClip
  active: boolean
  onPick: (clip: RevisionClip) => void
  depth?: number
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(clip)}
      className={`w-full text-left rounded-md px-2 py-1.5 text-xs ${active ? 'bg-white/15' : 'hover:bg-white/5'}`}
      style={{ paddingLeft: 18 + depth * 10 }}
    >
      <div className="font-medium truncate">{clip.titulo}</div>
      {clip.frase && <div className="text-[10px] text-zinc-400 line-clamp-2">{clip.frase}</div>}
    </button>
  )
}
