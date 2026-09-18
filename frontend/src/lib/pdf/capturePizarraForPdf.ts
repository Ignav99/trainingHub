'use client'

import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import TacticalBoardMini from '@/components/task-preview/TacticalBoardMini'
import { captureBoardPdfImage, selectPitchSvg } from '@/components/tactical-board/utils'
import type { TareaPizarraData } from '@/components/tactical-board/types'
import { diagramHasContent } from '@/lib/planPartidoDiagramRoles'
import { isUsablePizarraRaster, pickPizarraRaster } from './pizarraRaster'

export { isUsablePizarraRaster, pickPizarraRaster }

function waitPaint(ms = 40): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function') {
      window.setTimeout(resolve, ms)
      return
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, ms)
      })
    })
  })
}

function pitchPixelSize(data?: TareaPizarraData | null): { width: number; height: number } {
  const width = 1800
  if (data?.pitchType === 'half') {
    return { width, height: Math.round((width * 525) / 680) }
  }
  return { width, height: Math.round((width * 680) / 1050) }
}

async function rasterizeHost(host: HTMLElement): Promise<string | undefined> {
  const svg = selectPitchSvg(host)
  if (svg) {
    try {
      const live = await captureBoardPdfImage(svg)
      if (isUsablePizarraRaster(live)) return live
    } catch {
      /* screenshot fallback */
    }
  }
  try {
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(host, {
      backgroundColor: '#1a3a12',
      scale: 1,
      useCORS: true,
      logging: false,
    })
    const shot = canvas.toDataURL('image/jpeg', 0.92)
    if (isUsablePizarraRaster(shot)) return shot
  } catch {
    /* ignore */
  }
  return undefined
}

/**
 * Renders the tactical board off-screen and captures the real pitch as a sharp JPEG.
 * Does not use Lucide icons or the stored 720px thumbnail.
 */
export async function captureDiagramForPdf(
  data?: TareaPizarraData | null,
): Promise<string | undefined> {
  if (typeof document === 'undefined' || !data || !diagramHasContent(data)) return undefined

  const size = pitchPixelSize(data)
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.setAttribute('data-pizarra-pdf-capture', '1')
  host.style.cssText = [
    'position:fixed',
    'left:-9000px',
    'top:0',
    `width:${size.width}px`,
    `height:${size.height}px`,
    'pointer-events:none',
    'opacity:1',
    'z-index:-1',
    'background:#1a3a12',
  ].join(';')
  document.body.appendChild(host)
  const root = createRoot(host)

  try {
    flushSync(() => {
      root.render(
        createElement(TacticalBoardMini, {
          data,
          width: size.width,
          height: size.height,
          animate: false,
          showPlayBadge: false,
          autoplay: false,
        }),
      )
    })
    await waitPaint(40)
    let image = await rasterizeHost(host)
    if (!isUsablePizarraRaster(image)) {
      await waitPaint(120)
      image = await rasterizeHost(host)
    }
    return image
  } catch {
    return undefined
  } finally {
    try {
      root.unmount()
    } catch {
      /* ignore */
    }
    host.remove()
  }
}

/** Live capture from the diagram, else a stored raster that is actually a pitch. */
export async function resolvePizarraPng(
  stored?: string,
  diagrama?: TareaPizarraData | null,
): Promise<string | undefined> {
  const live = await captureDiagramForPdf(diagrama)
  return pickPizarraRaster(live, stored)
}
