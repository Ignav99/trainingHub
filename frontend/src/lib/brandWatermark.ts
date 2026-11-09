'use client'

import { useEffect, useState } from 'react'

/** Public path of the Kabin-e wordmark used as a watermark (lite edition). */
export const BRAND_WATERMARK_SRC = '/logo.png'

let cached: string | null = null
let pending: Promise<string | null> | null = null

/**
 * The watermark as a data URI. The pitch exports serialize the SVG and load it
 * through an <img>, where external hrefs are not fetched, so the logo must be
 * embedded for it to appear in PNG/WebM exports.
 */
export function loadBrandWatermarkDataUri(): Promise<string | null> {
  if (cached) return Promise.resolve(cached)
  if (pending) return pending
  if (typeof window === 'undefined') return Promise.resolve(null)
  pending = fetch(BRAND_WATERMARK_SRC)
    .then((r) => (r.ok ? r.blob() : null))
    .then((blob) => new Promise<string | null>((resolve) => {
      if (!blob) return resolve(null)
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    }))
    .then((uri) => {
      cached = uri
      pending = null
      return uri
    })
    .catch(() => {
      pending = null
      return null
    })
  return pending
}

export function useBrandWatermarkDataUri(enabled: boolean): string | null {
  const [uri, setUri] = useState<string | null>(cached)
  useEffect(() => {
    if (!enabled || uri) return
    let alive = true
    void loadBrandWatermarkDataUri().then((u) => { if (alive) setUri(u) })
    return () => { alive = false }
  }, [enabled, uri])
  return enabled ? uri : null
}

/**
 * Bottom-right placement inside a pitch viewBox. `inset` keeps it clear of the
 * touchline; the logo is 1:1 (512×512 source).
 */
export function watermarkBox(vbW: number, vbH: number, opts?: { ratio?: number; inset?: number }) {
  const ratio = opts?.ratio ?? 0.11
  const inset = opts?.inset ?? 34
  const size = Math.round(Math.min(vbW, vbH) * ratio)
  return { x: vbW - inset - size, y: vbH - inset - size, size }
}
