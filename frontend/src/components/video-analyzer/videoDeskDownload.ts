import { extractClipRange, joinMp4Blobs, LOCAL_CLIP_MAX_SECONDS, clipMimeToExt } from './extractClip'
import { clipDisplayTitle, clipFileName, downloadFileName, planDeskZip } from './videoDesk'
import { buildZipStore, downloadBlob } from './zipStore'
import type { CodeButton, CodeEvent } from './types'

export type DeskDownloadKind = 'clip' | 'marked' | 'folder' | 'all-folders' | 'all-flat'
export type DeskZipKind = Exclude<DeskDownloadKind, 'clip'>

function blobToBytes(blob: Blob): Promise<Uint8Array> {
  return blob.arrayBuffer().then((buf) => new Uint8Array(buf))
}

export async function extractAndDownloadDeskClips(opts: {
  video: HTMLVideoElement
  kind: DeskDownloadKind
  clips: CodeEvent[]
  buttons: CodeButton[]
  selectedClipId?: string | null
  selectedButtonId?: string | null
  markedClipIds?: string[]
  matchLabel: string
  archiveName?: string
  sourceFile?: File
  onProgress?: (label: string) => void
}): Promise<void> {
  const { video, kind, clips, buttons, matchLabel, sourceFile, onProgress } = opts
  const buttonById = new Map(buttons.map((b) => [b.id, b]))

  if (kind === 'clip') {
    const one = clips.find((c) => c.id === opts.selectedClipId)
    if (!one) throw new Error('Elige un recorte')
    onProgress?.('Recortando 1/1')
    const blob = await extractClipRange(video, one.startTime, one.endTime, {
      maxSeconds: LOCAL_CLIP_MAX_SECONDS,
      sourceFile,
      onProgress,
    })
    downloadBlob(blob, clipFileName(
      clipDisplayTitle(one, buttonById.get(one.buttonId)),
      one.startTime,
      one.endTime,
      clipMimeToExt(blob.type),
    ))
    return
  }

  const plan = planDeskZip({
    kind,
    clips,
    buttons,
    selectedButtonId: opts.selectedButtonId,
    markedClipIds: opts.markedClipIds,
    matchLabel,
    archiveName: opts.archiveName,
  })
  if (kind === 'folder' && !opts.selectedButtonId) throw new Error('Elige una carpeta')
  if (!plan.files.length) {
    throw new Error(
      kind === 'folder'
        ? 'Esa carpeta no tiene recortes'
        : kind === 'marked'
          ? 'Marca los recortes para revisión (⌘+clic o en el previsualizador)'
          : 'No hay recortes para descargar',
    )
  }

  const clipById = new Map(clips.map((clip) => [clip.id, clip]))

  if (kind === 'marked' && plan.files.length === 1) {
    const planned = plan.files[0]
    const clip = clipById.get(planned.clipId)
    if (!clip) throw new Error('Marca los recortes para revisión (⌘+clic o en el previsualizador)')
    onProgress?.('Recortando 1/1')
    const blob = await extractClipRange(video, clip.startTime, clip.endTime, {
      maxSeconds: LOCAL_CLIP_MAX_SECONDS,
      sourceFile,
      onProgress,
    })
    const label = opts.archiveName?.trim() || clipDisplayTitle(clip, buttonById.get(clip.buttonId))
    downloadBlob(blob, downloadFileName(label, clipMimeToExt(blob.type)))
    return
  }

  const files: { path: string; data: Uint8Array }[] = []
  for (let i = 0; i < plan.files.length; i++) {
    const planned = plan.files[i]
    const clip = clipById.get(planned.clipId)
    if (!clip) continue
    onProgress?.(`Recortando ${i + 1}/${plan.files.length}`)
    const blob = await extractClipRange(video, clip.startTime, clip.endTime, {
      maxSeconds: LOCAL_CLIP_MAX_SECONDS,
      sourceFile,
      onProgress,
    })
    const bytes = await blobToBytes(blob)
    const ext = clipMimeToExt(blob.type)
    const path = ext === 'mp4' ? planned.path : planned.path.replace(/\.mp4$/, `.${ext}`)
    files.push({ path, data: bytes })
  }

  onProgress?.('Empaquetando…')
  const zip = buildZipStore(files)
  downloadBlob(zip, plan.zipName)
}

export async function extractAndDownloadJoinedClips(opts: {
  video: HTMLVideoElement
  clips: CodeEvent[]
  orderedIds: string[]
  fileName: string
  sourceFile?: File
  onProgress?: (label: string) => void
}): Promise<void> {
  const byId = new Map(opts.clips.map((clip) => [clip.id, clip]))
  const ordered = opts.orderedIds.flatMap((id) => {
    const clip = byId.get(id)
    return clip ? [clip] : []
  })
  if (!ordered.length) {
    throw new Error('Marca los recortes para revisión (⌘+clic o en el previsualizador)')
  }

  const blobs: Blob[] = []
  for (let i = 0; i < ordered.length; i++) {
    const clip = ordered[i]
    opts.onProgress?.(`Recortando ${i + 1}/${ordered.length}`)
    blobs.push(await extractClipRange(opts.video, clip.startTime, clip.endTime, {
      maxSeconds: LOCAL_CLIP_MAX_SECONDS,
      sourceFile: opts.sourceFile,
      onProgress: opts.onProgress,
    }))
  }

  if (blobs.length === 1) {
    const ext = clipMimeToExt(blobs[0].type)
    downloadBlob(blobs[0], downloadFileName(opts.fileName, ext))
    return
  }

  opts.onProgress?.('Uniendo…')
  const joined = await joinMp4Blobs(blobs, opts.onProgress)
  downloadBlob(joined, downloadFileName(opts.fileName, 'mp4'))
}
