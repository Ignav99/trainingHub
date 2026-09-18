export const PITCH_SVG_SELECTOR = 'svg[data-tactical-pitch]'

function svgArea(el: SVGSVGElement): number {
  const vb = el.viewBox?.baseVal
  const w = (vb && vb.width) || el.clientWidth || Number(el.getAttribute('width')) || 0
  const h = (vb && vb.height) || el.clientHeight || Number(el.getAttribute('height')) || 0
  return w * h
}

/** The real pitch SVG, never a Lucide toolbar icon. */
export function selectPitchSvg(root: ParentNode | Element | null | undefined): SVGSVGElement | null {
  if (!root || !('querySelector' in root)) return null
  const marked = root.querySelector(PITCH_SVG_SELECTOR) as SVGSVGElement | null
  if (marked) return marked
  const all = Array.from(root.querySelectorAll('svg')) as SVGSVGElement[]
  let best: SVGSVGElement | null = null
  let bestArea = 0
  for (let i = 0; i < all.length; i++) {
    const area = svgArea(all[i])
    if (area > bestArea) {
      best = all[i]
      bestArea = area
    }
  }
  // Lucide icons are 24×24; a pitch viewBox is hundreds of units.
  if (best && bestArea >= 200 * 200) return best
  return null
}

/**
 * Export a board SVG element as raster image (PNG or JPEG).
 * Uses viewBox size so it works even when the SVG is not laid out yet.
 */
export function exportBoardPNG(
  svgElement: SVGSVGElement,
  opts?: {
    maxWidth?: number
    mime?: 'image/png' | 'image/jpeg'
    quality?: number
    /** Scale the viewBox up to maxWidth (PDF). Default only downscales. */
    upscale?: boolean
    pixelRatio?: number
  },
): Promise<string> {
  const maxWidth = opts?.maxWidth ?? 0
  const mime = opts?.mime ?? 'image/png'
  const quality = opts?.quality ?? 0.92
  const upscale = Boolean(opts?.upscale)

  return new Promise((resolve, reject) => {
    const clone = svgElement.cloneNode(true) as SVGSVGElement
    // Asegurar fondo opaco (evita transparencia negra en JPEG)
    const vb = svgElement.viewBox?.baseVal
    const srcW = (vb && vb.width) || svgElement.clientWidth || 680
    const srcH = (vb && vb.height) || svgElement.clientHeight || 525
    clone.setAttribute('width', String(srcW))
    clone.setAttribute('height', String(srcH))
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    }

    const svgData = new XMLSerializer().serializeToString(clone)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      let outW = srcW
      let outH = srcH
      if (maxWidth > 0 && (outW > maxWidth || upscale)) {
        const scale = maxWidth / outW
        outW = Math.round(maxWidth)
        outH = Math.round(srcH * scale)
      }
      const scale = opts?.pixelRatio ?? (upscale ? 1 : Math.min(2, maxWidth > 0 ? 1.5 : 2))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(outW * scale)
      canvas.height = Math.round(outH * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        return reject(new Error('No canvas context'))
      }
      // Fondo verde del campo por si el SVG no cubre
      ctx.fillStyle = '#1a3a0a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL(mime, quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load SVG'))
    }
    img.src = url
  })
}

/** Instantánea JPEG compacta para guardar en grafico_data.preview (listados). */
export function captureBoardPreview(svgElement: SVGSVGElement): Promise<string> {
  return exportBoardPNG(svgElement, {
    maxWidth: 720,
    mime: 'image/jpeg',
    quality: 0.72,
  })
}

/** Raster nítido del campo para el PDF de informe / plan (~300 dpi a 148 mm). */
export function captureBoardPdfImage(svgElement: SVGSVGElement): Promise<string> {
  return exportBoardPNG(svgElement, {
    maxWidth: 1800,
    mime: 'image/jpeg',
    quality: 0.92,
    upscale: true,
    pixelRatio: 1,
  })
}

/**
 * Download a data URL as a file.
 */
export function downloadPNG(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
