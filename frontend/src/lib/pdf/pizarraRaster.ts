/** Toolbar-icon JPEGs and empty placeholders are tiny; a real pitch is tens of KB. */
export function isUsablePizarraRaster(dataUrl?: string | null): boolean {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return false
  return dataUrl.length >= 8000
}

/** Prefer a live capture; never embed a Lucide-sized thumbnail. */
export function pickPizarraRaster(
  live?: string | null,
  stored?: string | null,
): string | undefined {
  if (isUsablePizarraRaster(live)) return live as string
  if (isUsablePizarraRaster(stored)) return stored as string
  return undefined
}
