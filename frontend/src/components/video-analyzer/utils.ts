import type { DrawingElement } from '@/types'

/**
 * Convert mouse/touch event to SVG coordinates using getScreenCTM.
 */
export function getSvgPosition(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  return {
    x: (clientX - ctm.e) / ctm.a,
    y: (clientY - ctm.f) / ctm.d,
  }
}

/**
 * Format seconds to MM:SS or H:MM:SS.
 */
export function formatTime(seconds: number): string {
  const s = Math.floor(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (h > 0) return `${h}:${pad(m)}:${pad(sec)}`
  return `${m}:${pad(sec)}`
}

/**
 * Export current video frame + SVG overlay as PNG data URL.
 */
export function exportFramePNG(
  video: HTMLVideoElement,
  svgElement: SVGSVGElement
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const vw = video.videoWidth || 1920
    const vh = video.videoHeight || 1080
    canvas.width = vw
    canvas.height = vh
    const ctx = canvas.getContext('2d')
    if (!ctx) return reject(new Error('No canvas context'))

    // Draw video frame
    ctx.drawImage(video, 0, 0, vw, vh)

    // Serialize SVG to image
    const svgClone = svgElement.cloneNode(true) as SVGSVGElement
    svgClone.setAttribute('width', String(vw))
    svgClone.setAttribute('height', String(vh))
    const svgData = new XMLSerializer().serializeToString(svgClone)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, vw, vh)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('SVG render failed'))
    }
    img.src = url
  })
}

/**
 * Generate a thumbnail (smaller) from video + SVG overlay.
 */
export function generateThumbnail(
  video: HTMLVideoElement,
  svgElement: SVGSVGElement
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const thumbW = 320
    const thumbH = 180
    canvas.width = thumbW
    canvas.height = thumbH
    const ctx = canvas.getContext('2d')
    if (!ctx) return reject(new Error('No canvas context'))

    ctx.drawImage(video, 0, 0, thumbW, thumbH)

    const svgClone = svgElement.cloneNode(true) as SVGSVGElement
    svgClone.setAttribute('width', String(thumbW))
    svgClone.setAttribute('height', String(thumbH))
    const svgData = new XMLSerializer().serializeToString(svgClone)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, thumbW, thumbH)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Thumbnail SVG render failed'))
    }
    img.src = url
  })
}

/**
 * Download a data URL as a file.
 */
export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * Generate a unique ID for drawing elements.
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}
