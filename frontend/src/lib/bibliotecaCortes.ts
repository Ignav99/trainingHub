/** Etiqueta de espacio ocupado en la biblioteca. Sin límite. */

export function formatStorageBytes(size: number): string {
  const n = Math.max(0, Math.floor(Number.isFinite(size) ? size : 0))
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1).replace('.', ',')} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2).replace('.', ',')} GB`
}

export function minuteLabel(inicio?: number | null, fin?: number | null): string {
  if (inicio == null && fin == null) return ''
  if (inicio != null && fin != null && fin !== inicio) return `${inicio}'–${fin}'`
  return `${inicio ?? fin}'`
}
