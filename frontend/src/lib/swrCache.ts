import { mutate } from 'swr'

/** Revalida claves SWR en segundo plano. No bloquear el guardado esperando esto. */
export function revalidateKeysContaining(...needles: string[]) {
  void mutate(
    (key: unknown) =>
      typeof key === 'string' && needles.some((needle) => key.includes(needle)),
    undefined,
    { revalidate: true },
  )
}
