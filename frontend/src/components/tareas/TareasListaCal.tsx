'use client'

import { Copy, Loader2, MoreHorizontal, Sparkles, Trash2 } from 'lucide-react'
import { TacticalBoardMini } from '@/components/task-preview'
import { FASES_JUEGO, nombreSubfase } from '@/lib/catalogos/canonico'
import type { Tarea } from '@/types'

interface Props {
  tareas: Tarea[]
  tab: string
  activeMenu: string | null
  setActiveMenu: (id: string | null) => void
  copying: string | null
  onOpen: (tarea: Tarea) => void
  onVariantes: (tarea: Tarea) => void
  onCreateVariante: (tarea: Tarea) => void
  onCopy: (tarea: Tarea, e: React.MouseEvent) => void
  onDuplicate: (tarea: Tarea, e: React.MouseEvent) => void
  onDelete: (id: string, e: React.MouseEvent) => void
}

function faseTexto(t: Tarea) {
  if (!t.fase_juego) return null
  const fase = FASES_JUEGO.find((f) => f.codigo === t.fase_juego)?.nombre || t.fase_juego.replace(/_/g, ' ')
  const sub = nombreSubfase(t.fase_juego, t.principio_tactico)
  return sub ? `${fase} · ${sub}` : fase
}

/** Biblioteca de tareas en Cal: lista continua densa, miniatura sin marco redondeado. */
export function TareasListaCal({
  tareas,
  tab,
  activeMenu,
  setActiveMenu,
  copying,
  onOpen,
  onVariantes,
  onCreateVariante,
  onCopy,
  onDuplicate,
  onDelete,
}: Props) {
  const item =
    'flex w-full items-center gap-2 px-3 h-11 text-left text-sm hover:bg-sunken focus-visible:bg-sunken focus-visible:outline-none'
  return (
    <ul className="cal-linea bg-card">
      {tareas.map((t) => {
        const abierto = activeMenu === t.id
        const sigla = t.categoria?.nombre_corto || t.categoria?.nombre || t.categoria?.codigo
        const fase = faseTexto(t)
        const nVar = t.num_variantes ?? 0
        const esVariante = !!t.tarea_origen_id
        const jug =
          t.num_jugadores_min != null
            ? `${t.num_jugadores_min}${t.num_jugadores_max && t.num_jugadores_max !== t.num_jugadores_min ? `-${t.num_jugadores_max}` : ''}`
            : null
        return (
          <li
            key={t.id}
            tabIndex={0}
            onClick={() => onOpen(t)}
            onKeyDown={(e) => {
              if (e.target === e.currentTarget && e.key === 'Enter') onOpen(t)
            }}
            className="relative flex min-h-[72px] cursor-pointer items-center gap-3 border-b border-border p-2 last:border-b-0 hover:bg-sunken focus-visible:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
          >
            <div className="relative aspect-[16/9] w-24 flex-none bg-sunken sm:w-32">
              <TacticalBoardMini
                data={t.grafico_data as any}
                width="100%"
                height="100%"
                className="absolute inset-0 h-full w-full"
                animate={false}
                autoplay={false}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                {sigla && <span className="cal-rotulo flex-none text-muted-foreground">{sigla}</span>}
                <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">{t.titulo}</h3>
              </div>
              {(t.desarrollo || t.descripcion) && (
                <p className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">{t.desarrollo || t.descripcion}</p>
              )}
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {[fase, esVariante ? 'Variante' : nVar > 0 ? `Madre · ${nVar}` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex flex-none items-center gap-3 font-mono text-xs tabular-nums text-muted-foreground">
              {t.duracion_total != null && <span>{t.duracion_total}′</span>}
              {jug && <span>{jug} jug.</span>}
            </div>
            <div className="relative flex-none" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                aria-label={`Acciones de ${t.titulo}`}
                aria-haspopup="menu"
                aria-expanded={abierto}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveMenu(abierto ? null : t.id)
                }}
                className="inline-flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              </button>
              {abierto && (
                <div role="menu" className="cal-linea absolute right-0 top-full z-20 w-52 bg-card py-1">
                  {tab !== 'biblioteca' && (
                    <button
                      role="menuitem"
                      type="button"
                      className={item}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveMenu(null)
                        onCreateVariante(t)
                      }}
                    >
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      Crear variante
                    </button>
                  )}
                  {!esVariante && (
                    <button
                      role="menuitem"
                      type="button"
                      className={item}
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveMenu(null)
                        onVariantes(t)
                      }}
                    >
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      Ver variantes
                    </button>
                  )}
                  {tab === 'biblioteca' ? (
                    <button role="menuitem" type="button" className={item} onClick={(e) => onCopy(t, e)}>
                      {copying === t.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      )}
                      Copiar a mis tareas
                    </button>
                  ) : (
                    <>
                      <button role="menuitem" type="button" className={item} onClick={(e) => onDuplicate(t, e)}>
                        <Copy className="h-4 w-4" aria-hidden="true" />
                        Duplicar
                      </button>
                      <button role="menuitem" type="button" className={`${item} text-destructive`} onClick={(e) => onDelete(t.id, e)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
