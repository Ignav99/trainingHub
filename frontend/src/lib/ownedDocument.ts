/** A document may be saved only after the user edits the copy that belongs to this id. */
export function shouldPersistOwnedDoc(
  loadedOwnerId: string | null,
  currentId: string,
  dirty: boolean,
): boolean {
  return dirty && loadedOwnerId != null && loadedOwnerId === currentId
}

/**
 * The weekly copy may fill gaps only while the same rival stays on screen.
 * After a rival change, an empty profile stays empty.
 */
export function weeklyFallbackForRival<T>(
  switchingRival: boolean,
  weekly: T | null | undefined,
): T | undefined {
  if (switchingRival || weekly == null) return undefined
  return weekly
}
