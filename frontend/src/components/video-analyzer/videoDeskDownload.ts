import { extractClipRange, LOCAL_CLIP_MAX_SECONDS, clipMimeToExt } from './extractClip'
import { clipDisplayTitle, clipFileName, planDeskZip } from './videoDesk'
import { buildZipStore, downloadBlob } from './zipStore'
import type { CodeButton, CodeEvent } from './types'

export type DeskDownloadKind = 'clip' | 'folder' | 'all-folders' | 'all-flat'

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
    matchLabel,
    archiveName: opts.archiveName,
  })
  if (kind === 'folder' && !opts.selectedButtonId) throw new Error('Elige una carpeta')
  if (!plan.files.length) {
    throw new Error(kind === 'folder' ? 'Esa carpeta no tiene recortes' : 'No hay recortes para descargar')
  }

  const clipById = new Map(clips.map((clip) => [clip.id, clip]))
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
