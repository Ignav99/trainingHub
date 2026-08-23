'use client'

import { useCallback, useRef, useState } from 'react'
import TacticalBoardMini from '@/components/task-preview/TacticalBoardMini'
import { informesApi } from '@/lib/api/informes'
import { tareasApi } from '@/lib/api/tareas'
import type { TareaPizarraData } from '@/components/tactical-board/types'

type Board = { id: string; grafico_data: TareaPizarraData }

/**
 * Recaptura la foto real del editor (ABPPitch) y pisa el JPEG inventado
 * del informe 6 antes de generar el PDF.
 */
export function useHealPizarras() {
  const [boards, setBoards] = useState<Board[]>([])
  const pendingRef = useRef<Map<string, Board>>(new Map())
  const inflightRef = useRef(0)
  const doneRef = useRef<((n: number) => void) | null>(null)
  const savedRef = useRef(0)
  const timerRef = useRef<number>(0)

  const finish = useCallback((n: number) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = 0
    const cb = doneRef.current
    doneRef.current = null
    setBoards([])
    pendingRef.current.clear()
    cb?.(n)
  }, [])

  const onReady = useCallback((id: string, preview: string) => {
    const board = pendingRef.current.get(id)
    if (!board) return
    pendingRef.current.delete(id)
    inflightRef.current += 1
    const next = { ...board.grafico_data, preview }
    void tareasApi
      .update(id, { grafico_data: next, grafico_url: preview })
      .then(() => { savedRef.current += 1 })
      .catch(() => { /* no bloquear el PDF */ })
      .finally(() => {
        inflightRef.current -= 1
        if (pendingRef.current.size === 0 && inflightRef.current === 0) {
          finish(savedRef.current)
        }
      })
  }, [finish])

  const heal = useCallback(async (microcicloId?: string | null) => {
    if (!microcicloId) return 0
    const list = (await informesApi.pizarrasSemana(microcicloId)) as Board[]
    if (!list.length) return 0
    savedRef.current = 0
    inflightRef.current = 0
    pendingRef.current = new Map(list.map((b) => [b.id, b]))
    return new Promise<number>((resolve) => {
      doneRef.current = resolve
      setBoards(list)
      timerRef.current = window.setTimeout(() => finish(savedRef.current), 14000)
    })
  }, [finish])

  const gate = boards.length === 0 ? null : (
    <div
      aria-hidden
      className="pointer-events-none fixed left-[-240vw] top-0 h-[680px] w-[1050px] overflow-hidden"
    >
      {boards.map((b) => (
        <TacticalBoardMini
          key={b.id}
          data={b.grafico_data}
          width={1050}
          height={680}
          animate={false}
          showPlayBadge={false}
          onPreviewReady={(preview) => onReady(b.id, preview)}
        />
      ))}
    </div>
  )

  return { heal, gate }
}
