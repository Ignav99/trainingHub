'use client'

/**
 * Graba la animación de una pizarra (keyframes) como vídeo descargable.
 * No vive en utils.ts para evitar un ciclo: TacticalBoardMini ya importa utils.
 */

import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import TacticalBoardMini from '@/components/task-preview/TacticalBoardMini'
import { exportBoardPNG } from './utils'
import { sampleAnimation, totalDuration } from './interpolate'
import type { TareaPizarraData } from './types'

function pickMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || null
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

function waitPaint(ms = 40): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, ms)
      })
    })
  })
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo leer el frame'))
    img.src = dataUrl
  })
}

export async function exportBoardWebM(
  data: TareaPizarraData,
  opts?: { fps?: number; onProgress?: (p: number) => void },
): Promise<{ blob: Blob; extension: 'webm' | 'mp4' }> {
  const frames = data.frames
  if (!frames || frames.length < 2) {
    throw new Error('La animación necesita al menos 2 fases')
  }
  const mime = pickMime()
  if (!mime) {
    throw new Error('Este navegador no puede grabar vídeo. Abre TrainingHub en Chrome o Edge.')
  }

  const fps = opts?.fps ?? 12
  const durationMs = Math.max(totalDuration(frames), 1000)
  const n = Math.max(2, Math.round((durationMs / 1000) * fps))

  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:fixed;left:-12000px;top:0;width:680px;height:525px;pointer-events:none;'
  document.body.appendChild(host)
  const root: Root = createRoot(host)

  const renderSnapshot = async (snapshot: TareaPizarraData): Promise<SVGSVGElement> => {
    root.render(
      createElement(TacticalBoardMini, {
        data: snapshot,
        width: 680,
        height: 525,
        animate: false,
        showPlayBadge: false,
        autoplay: false,
      }),
    )
    await waitPaint()
    const svg = host.querySelector('svg')
    if (!svg) throw new Error('No se pudo renderizar el frame')
    return svg as SVGSVGElement
  }

  const snapshotAt = (t: number): TareaPizarraData => {
    const sampled = sampleAnimation(frames, t)
    if (!sampled) throw new Error('Sin frames interpolados')
    return {
      pitchType: data.pitchType,
      tipo: 'static',
      elements: sampled.elements,
      arrows: sampled.arrows,
      zones: sampled.zones,
    }
  }

  try {
    const svg0 = await renderSnapshot(snapshotAt(0))
    const png0 = await exportBoardPNG(svg0, { maxWidth: 960 })
    const img0 = await loadImage(png0)

    const canvas = document.createElement('canvas')
    canvas.width = img0.width
    canvas.height = img0.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo crear el canvas')

    const stream = canvas.captureStream(fps)
    const chunks: Blob[] = []
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_400_000 })
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data)
    }

    const stopped = new Promise<void>((resolve, reject) => {
      rec.onstop = () => resolve()
      rec.onerror = () => reject(new Error('Error al grabar el vídeo'))
    })

    rec.start(200)
    ctx.drawImage(img0, 0, 0)
    opts?.onProgress?.(0)
    await new Promise((r) => setTimeout(r, Math.round(1000 / fps)))

    for (let i = 1; i < n; i++) {
      const t = i / (n - 1)
      const svg = await renderSnapshot(snapshotAt(t))
      const png = await exportBoardPNG(svg, { maxWidth: 960 })
      const img = await loadImage(png)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      opts?.onProgress?.(i / (n - 1))
      await new Promise((r) => setTimeout(r, Math.round(1000 / fps)))
    }

    rec.stop()
    await stopped

    if (chunks.length === 0) {
      throw new Error('El vídeo salió vacío. Prueba de nuevo en Chrome.')
    }

    const extension = mime.includes('mp4') ? 'mp4' : 'webm'
    return { blob: new Blob(chunks, { type: mime.split(';')[0] }), extension }
  } finally {
    root.unmount()
    host.remove()
  }
}
