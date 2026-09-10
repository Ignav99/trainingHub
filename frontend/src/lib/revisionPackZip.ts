import { clipPlaySrc, type RevisionClip, type RevisionPack } from '@/lib/api/revision'
import { sanitizeZipName, zipStore } from '@/lib/zipStore'

function clipExt(clip: RevisionClip): string {
  const mime = (clip.mime_type || '').toLowerCase()
  if (mime.includes('mp4')) return 'mp4'
  if (mime.includes('quicktime') || (clip.titulo || '').toLowerCase().endsWith('.mov')) return 'mov'
  if (mime.includes('webm')) return 'webm'
  const fromTitle = (clip.titulo || '').split('.').pop()
  if (fromTitle && fromTitle.length <= 4 && fromTitle !== clip.titulo) return fromTitle
  return 'webm'
}

function clipZipPath(pack: RevisionPack, clip: RevisionClip, used: Set<string>): string {
  const link = pack.links.find((l) => l.clip_id === clip.id && l.folder_id)
  const folder = pack.folders.find((f) => f.id === (link?.folder_id || ''))
  const folderName = sanitizeZipName(folder?.nombre || 'recortes')
  let base = `${folderName}/${sanitizeZipName(clip.titulo)}.${clipExt(clip)}`
  if (used.has(base)) base = `${folderName}/${sanitizeZipName(clip.titulo)}_${clip.id.slice(0, 6)}.${clipExt(clip)}`
  used.add(base)
  return base
}

export function hotClipsForZip(pack: RevisionPack): RevisionClip[] {
  return pack.clips.filter((c) => c.status === 'hot' && clipPlaySrc(c))
}

export async function downloadRevisionPackZip(
  pack: RevisionPack,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const clips = hotClipsForZip(pack)
  if (clips.length === 0) {
    throw new Error('No hay recortes para descargar')
  }
  const used = new Set<string>()
  const files: { name: string; data: Uint8Array }[] = []
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    const src = clipPlaySrc(clip)
    if (!src) continue
    const res = await fetch(src)
    if (!res.ok) {
      throw new Error(`No se pudo bajar «${clip.titulo}» (${res.status})`)
    }
    const buf = new Uint8Array(await res.arrayBuffer())
    files.push({ name: clipZipPath(pack, clip, used), data: buf })
    onProgress?.(i + 1, clips.length)
  }
  const blob = zipStore(files)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `revision-${sanitizeZipName(pack.ambito)}-${pack.id.slice(0, 8)}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
