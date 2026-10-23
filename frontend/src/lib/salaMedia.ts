/** Pantalla completa del recuadro de vídeo (sala / presentación). */

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}

type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

export function currentFullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null
  const doc = document as WebkitDocument
  return document.fullscreenElement || doc.webkitFullscreenElement || null
}

export function paneIsFullscreen(el: HTMLElement | null): boolean {
  return !!el && currentFullscreenElement() === el
}

export async function enterPaneFullscreen(el: HTMLElement | null): Promise<boolean> {
  if (!el) return false
  if (paneIsFullscreen(el)) return true
  try {
    await el.requestFullscreen?.()
    return paneIsFullscreen(el)
  } catch {
    return false
  }
}

export async function exitPaneFullscreen(): Promise<void> {
  if (!currentFullscreenElement()) return
  const doc = document as WebkitDocument
  try {
    if (document.exitFullscreen) await document.exitFullscreen()
    else await doc.webkitExitFullscreen?.()
  } catch {
    // ignore
  }
}

/** Oculta la barra del navegador en este aparato. Hace falta un toque en el botón. */
export async function enterPresentationFullscreen(el: HTMLElement | null): Promise<boolean> {
  if (!el) return false
  if (currentFullscreenElement() === el) return true
  if (currentFullscreenElement()) {
    try {
      await exitPaneFullscreen()
    } catch {
      // seguimos e intentamos la presentación
    }
  }
  const node = el as WebkitElement
  try {
    if (node.requestFullscreen) await node.requestFullscreen()
    else if (node.webkitRequestFullscreen) await node.webkitRequestFullscreen()
    else return false
  } catch {
    return false
  }
  return currentFullscreenElement() === el
}

export function presentationIsFullscreen(el: HTMLElement | null): boolean {
  return !!el && currentFullscreenElement() === el
}
