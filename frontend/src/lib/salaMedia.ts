/** Pantalla completa del recuadro de vídeo (sala / presentación). */

export function paneIsFullscreen(el: HTMLElement | null): boolean {
  return !!el && document.fullscreenElement === el
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
  if (!document.fullscreenElement) return
  try {
    await document.exitFullscreen()
  } catch {
    // ignore
  }
}
