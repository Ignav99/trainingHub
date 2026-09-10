/** Zoom de sala: pellizco tipo cámara, sin pintar. */

export const MIN_ZOOM = 1
export const MAX_ZOOM = 4

export interface ZoomState {
  scale: number
  x: number
  y: number
}

export const IDENTITY_ZOOM: ZoomState = { scale: 1, x: 0, y: 0 }

export function clampZoom(scale: number): number {
  if (Number.isNaN(scale)) return MIN_ZOOM
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale))
}

export function isIdentityZoom(zoom: ZoomState): boolean {
  return zoom.scale <= 1.001 && Math.abs(zoom.x) < 0.5 && Math.abs(zoom.y) < 0.5
}

export function clampPan(state: ZoomState, width: number, height: number): ZoomState {
  const scale = clampZoom(state.scale)
  if (scale <= 1.001) return { ...IDENTITY_ZOOM }
  const maxX = ((scale - 1) * Math.max(width, 1)) / 2
  const maxY = ((scale - 1) * Math.max(height, 1)) / 2
  return {
    scale,
    x: Math.min(maxX, Math.max(-maxX, state.x)),
    y: Math.min(maxY, Math.max(-maxY, state.y)),
  }
}

export function pinchDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Escala alrededor de un punto (coords respecto al centro del recuadro). */
export function zoomAt(
  state: ZoomState,
  nextScale: number,
  focalX: number,
  focalY: number,
  width: number,
  height: number,
): ZoomState {
  const scale = clampZoom(nextScale)
  const prev = Math.max(state.scale, 0.0001)
  const ratio = scale / prev
  return clampPan({
    scale,
    x: focalX - (focalX - state.x) * ratio,
    y: focalY - (focalY - state.y) * ratio,
  }, width, height)
}

export function zoomCss(zoom: ZoomState): { transform: string; transformOrigin: string } | undefined {
  if (isIdentityZoom(zoom)) return undefined
  return {
    transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
    transformOrigin: 'center center',
  }
}

export const REPEAT_SECONDS = 2
export const JOG_SECONDS = 0.12
