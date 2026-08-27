export const TAREA_PAGE_SIZES = [12, 24, 64] as const
export type TareaPageSize = (typeof TAREA_PAGE_SIZES)[number]

export const TAREA_PAGE_SIZE_KEY = 'traininghub-tareas-page-size'
export const DEFAULT_TAREA_PAGE_SIZE: TareaPageSize = 24

export function isTareaPageSize(value: number): value is TareaPageSize {
  return (TAREA_PAGE_SIZES as readonly number[]).includes(value)
}

export function readTareaPageSize(): TareaPageSize {
  if (typeof window === 'undefined') return DEFAULT_TAREA_PAGE_SIZE
  try {
    const raw = Number(window.localStorage.getItem(TAREA_PAGE_SIZE_KEY))
    if (isTareaPageSize(raw)) return raw
  } catch {
    /* private mode / disabled storage */
  }
  return DEFAULT_TAREA_PAGE_SIZE
}

export function writeTareaPageSize(size: TareaPageSize) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TAREA_PAGE_SIZE_KEY, String(size))
  } catch {
    /* ignore */
  }
}
