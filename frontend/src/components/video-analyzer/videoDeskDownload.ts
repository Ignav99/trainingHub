import { burnWatermark, extractClipRange, LOCAL_CLIP_MAX_SECONDS, clipMimeToExt } from './extractClip'
import { clipDisplayTitle, clipFileName, zipFolderName } from './videoDesk'
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
  sourceFile?: File
  onProgress?: (label: string) => void
  /** Burn this logo into every clip (lite). Slower: needs a re-encode. */
  watermarkUrl?: string
}): Promise<{ watermarkFailed: number }> {
  const { video, kind, clips, buttons, matchLabel, sourceFile, onProgress, watermarkUrl } = opts
  let watermarkFailed = 0
  const buttonById = new Map(buttons.map((b) => [b.id, b]))

  const named = (clip: CodeEvent, mime?: string | null) => {
    const btn = buttonById.get(clip.buttonId)
    return clipFileName(clipDisplayTitle(clip, btn), clip.startTime, clip.endTime, clipMimeToExt(mime))
  }

  const folderOf = (clip: CodeEvent) => {
    const btn = buttonById.get(clip.buttonId)
    return zipFolderName(btn?.label || 'Otros momentos')
  }

  let selected = clips
  if (kind === 'clip') {
    const one = clips.find((c) => c.id === opts.selectedClipId)
    if (!one) throw new Error('Elige un recorte')
    selected = [one]
  } else if (kind === 'folder') {
    const btnId = opts.selectedButtonId
    if (!btnId) throw new Error('Elige una carpeta')
    selected = clips.filter((c) => c.buttonId === btnId)
    if (!selected.length) throw new Error('Esa carpeta no tiene recortes')
  }

  if (!selected.length) throw new Error('No hay recortes para descargar')

  const files: { path: string; data: Uint8Array }[] = []
  for (let i = 0; i < selected.length; i++) {
    const clip = selected[i]
    onProgress?.(`Recortando ${i + 1}/${selected.length}`)
    let blob = await extractClipRange(video, clip.startTime, clip.endTime, {
      maxSeconds: LOCAL_CLIP_MAX_SECONDS,
      sourceFile,
      onProgress,
    })
    if (watermarkUrl) {
      onProgress?.(`Añadiendo el logo ${i + 1}/${selected.length}…`)
      const marked = await burnWatermark(
        blob,
        watermarkUrl,
        video.videoWidth || 1920,
        video.videoHeight || 1080
      )
      if (marked) blob = marked
      else watermarkFailed++
    }
    const bytes = await blobToBytes(blob)
    const name = named(clip, blob.type)
    if (kind === 'clip') {
      downloadBlob(blob, name)
      return { watermarkFailed }
    }
    const path = kind === 'all-flat' ? name : `${folderOf(clip)}/${name}`
    files.push({ path, data: bytes })
  }

  const zipName =
    kind === 'folder'
      ? `${zipFolderName(buttonById.get(opts.selectedButtonId || '')?.label || 'carpeta')} — recortes.zip`
      : kind === 'all-flat'
        ? `${zipFolderName(matchLabel)} — clips.zip`
        : `${zipFolderName(matchLabel)} — carpetas.zip`

  onProgress?.('Empaquetando…')
  const zip = buildZipStore(files)
  downloadBlob(zip, zipName)
  return { watermarkFailed }
}
