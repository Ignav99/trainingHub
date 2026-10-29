import { buildZipStore, downloadBlob } from '../components/video-analyzer/zipStore'
import type { BibliotecaDescarga } from './api/bibliotecaCortes'

/** Por encima de esto el ZIP se arma en memoria del navegador; mejor bajar uno a uno. */
export const ZIP_MAX_BYTES = 1500 * 1024 * 1024

export function uniqueFileNames(names: string[]): string[] {
  const used = new Set<string>()
  return names.map((name) => {
    const dot = name.lastIndexOf('.')
    const stem = dot > 0 ? name.slice(0, dot) : name
    const ext = dot > 0 ? name.slice(dot) : ''
    let candidate = name
    for (let n = 2; used.has(candidate.toLowerCase()); n++) candidate = `${stem} (${n})${ext}`
    used.add(candidate.toLowerCase())
    return candidate
  })
}

export function zipNameForToday(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `cortes-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.zip`
}

function clickDownload(href: string, filename?: string) {
  const a = document.createElement('a')
  a.href = href
  if (filename) a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

async function oneByOne(items: BibliotecaDescarga[]) {
  for (let i = 0; i < items.length; i++) {
    clickDownload(items[i].download_url, items[i].filename)
    if (i < items.length - 1) await new Promise((resolve) => window.setTimeout(resolve, 700))
  }
}

/**
 * Baja el archivo original de cada corte, sin recodificar.
 * Uno: lo guarda el navegador directamente. Varios: un ZIP sin comprimir;
 * si no se puede leer el vídeo desde aquí, uno a uno.
 */
export async function descargarCortes(
  items: BibliotecaDescarga[],
  onProgress?: (label: string) => void,
): Promise<'archivo' | 'zip' | 'sueltos'> {
  if (items.length === 0) throw new Error('Esos cortes no tienen vídeo para descargar')
  if (items.length === 1) {
    clickDownload(items[0].download_url, items[0].filename)
    return 'archivo'
  }
  const total = items.reduce((sum, item) => sum + (item.size_bytes || 0), 0)
  if (total > ZIP_MAX_BYTES) {
    await oneByOne(items)
    return 'sueltos'
  }
  const names = uniqueFileNames(items.map((item) => item.filename))
  const files: { path: string; data: Uint8Array }[] = []
  try {
    for (let i = 0; i < items.length; i++) {
      onProgress?.(`Bajando ${i + 1}/${items.length}`)
      const res = await fetch(items[i].url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      files.push({ path: names[i], data: new Uint8Array(await res.arrayBuffer()) })
    }
  } catch {
    await oneByOne(items)
    return 'sueltos'
  }
  onProgress?.('Empaquetando…')
  downloadBlob(buildZipStore(files), zipNameForToday())
  return 'zip'
}
