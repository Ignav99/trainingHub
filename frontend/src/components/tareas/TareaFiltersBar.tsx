'use client'

/**
 * Barra de filtros canónica para biblioteca / picker de tareas.
 * Solo variables que el creador de tareas define (canonico + FaseSubfasePicker).
 * NO incluye densidad ni cognitivo (derivados de pizarra, no editables).
 */

import type { ReactNode } from 'react'
import {
  CATEGORIAS_TAREA,
  METODOLOGIAS_TAREA,
  FASES_JUEGO,
  OBJETIVOS_TACTICOS,
  OBJETIVOS_TECNICOS,
  ORIENTACIONES_FISICAS,
  TIPOS_VARIANTE,
  subfasesForFase,
} from '@/lib/catalogos/canonico'
import { cn } from '@/lib/utils'

export interface TareaFilterValues {
  categoria: string
  modalidad: string
  faseJuego: string
  subfase: string
  objetivoTactico: string
  objetivoTecnico: string
  orientacionFisica: string
  jugadoresMin: string
  jugadoresMax: string
  /** madres | todas | variantes */
  familia: 'madres' | 'todas' | 'variantes'
  tipoVariante: string
}

export const EMPTY_TAREA_FILTERS: TareaFilterValues = {
  categoria: '',
  modalidad: '',
  faseJuego: '',
  subfase: '',
  objetivoTactico: '',
  objetivoTecnico: '',
  orientacionFisica: '',
  jugadoresMin: '',
  jugadoresMax: '',
  familia: 'madres',
  tipoVariante: '',
}

export function tareaFiltersActive(v: TareaFilterValues, opts?: { ignoreFamiliaDefault?: boolean }) {
  const familiaActive = opts?.ignoreFamiliaDefault
    ? v.familia !== 'todas'
    : v.familia !== 'madres' || !!v.tipoVariante
  return !!(
    v.categoria ||
    v.modalidad ||
    v.faseJuego ||
    v.subfase ||
    v.objetivoTactico ||
    v.objetivoTecnico ||
    v.orientacionFisica ||
    v.jugadoresMin ||
    v.jugadoresMax ||
    v.tipoVariante ||
    (opts?.ignoreFamiliaDefault ? familiaActive : v.familia !== 'madres')
  )
}

/** Params API alineados con el backend /tareas */
export function tareaFiltersToApiParams(v: TareaFilterValues) {
  return {
    categoria: v.categoria || undefined,
    modalidad: v.modalidad || undefined,
    fase_juego: v.faseJuego || undefined,
    principio_tactico: v.subfase || undefined,
    objetivo_tactico: v.objetivoTactico || undefined,
    objetivo_tecnico: v.objetivoTecnico || undefined,
    orientacion_fisica: v.orientacionFisica || undefined,
    jugadores_min: v.jugadoresMin ? Number(v.jugadoresMin) : undefined,
    jugadores_max: v.jugadoresMax ? Number(v.jugadoresMax) : undefined,
    solo_madres: v.familia === 'madres' ? true : undefined,
    solo_variantes: v.familia === 'variantes' ? true : undefined,
    tipo_variante: v.tipoVariante || undefined,
  }
}

const selectClass =
  'h-9 rounded-lg border border-border bg-background px-2.5 text-sm min-w-[9rem] max-w-[14rem]'

export interface TareaFiltersBarProps {
  value: TareaFilterValues
  onChange: (patch: Partial<TareaFilterValues>) => void
  onClear?: () => void
  /** Categorías disponibles (picker restringido). */
  categorias?: typeof CATEGORIAS_TAREA | ReadonlyArray<{ codigo: string; nombre: string }>
  /** Oculta metodología/fase/objetivos (margen/portero). */
  compact?: boolean
  /** Muestra selector de familia madre/variantes. */
  showFamilia?: boolean
  /** Ordenación opcional a la derecha. */
  sortSlot?: ReactNode
  className?: string
}

export function TareaFiltersBar({
  value,
  onChange,
  onClear,
  categorias = CATEGORIAS_TAREA,
  compact = false,
  showFamilia = true,
  sortSlot,
  className,
}: TareaFiltersBarProps) {
  const subfases = subfasesForFase(value.faseJuego)
  const active = tareaFiltersActive(value)

  const set = (patch: Partial<TareaFilterValues>) => onChange(patch)

  return (
    <div className={cn('rounded-2xl border bg-card p-3 space-y-2', className)}>
      <div className="flex flex-wrap gap-2 items-center">
        {showFamilia && (
          <select
            className={selectClass}
            value={value.familia}
            onChange={(e) =>
              set({
                familia: e.target.value as TareaFilterValues['familia'],
                tipoVariante: e.target.value === 'madres' ? '' : value.tipoVariante,
              })
            }
            title="Familia de tareas"
          >
            <option value="madres">Solo tareas madre</option>
            <option value="todas">Madres + variantes</option>
            <option value="variantes">Solo variantes</option>
          </select>
        )}

        {showFamilia && value.familia === 'variantes' && (
          <select
            className={selectClass}
            value={value.tipoVariante}
            onChange={(e) => set({ tipoVariante: e.target.value })}
          >
            <option value="">Tipo de variante</option>
            {TIPOS_VARIANTE.filter((t) => t.codigo !== 'original').map((t) => (
              <option key={t.codigo} value={t.codigo}>
                {t.nombre}
              </option>
            ))}
          </select>
        )}

        <select
          className={selectClass}
          value={value.categoria}
          onChange={(e) => set({ categoria: e.target.value })}
        >
          <option value="">
            {categorias.length === 1 ? categorias[0].nombre : 'Tipo de tarea'}
          </option>
          {categorias.map((c) => (
            <option key={c.codigo} value={c.codigo}>
              {c.nombre}
            </option>
          ))}
        </select>

        {!compact && (
          <>
            <select
              className={selectClass}
              value={value.modalidad}
              onChange={(e) => set({ modalidad: e.target.value })}
            >
              <option value="">Metodología</option>
              {METODOLOGIAS_TAREA.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.nombre}
                </option>
              ))}
            </select>

            <select
              className={selectClass}
              value={value.faseJuego}
              onChange={(e) =>
                set({ faseJuego: e.target.value, subfase: '' })
              }
            >
              <option value="">Fase de juego</option>
              {FASES_JUEGO.map((f) => (
                <option key={f.codigo} value={f.codigo}>
                  {f.nombre}
                </option>
              ))}
            </select>

            {subfases && (
              <select
                className={selectClass}
                value={value.subfase}
                onChange={(e) => set({ subfase: e.target.value })}
              >
                <option value="">Subfase</option>
                {subfases.map((s) => (
                  <option key={s.codigo} value={s.codigo}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            )}

            <select
              className={selectClass}
              value={value.objetivoTactico}
              onChange={(e) => set({ objetivoTactico: e.target.value })}
            >
              <option value="">Objetivo táctico</option>
              {OBJETIVOS_TACTICOS.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <select
              className={selectClass}
              value={value.objetivoTecnico}
              onChange={(e) => set({ objetivoTecnico: e.target.value })}
            >
              <option value="">Objetivo técnico</option>
              {OBJETIVOS_TECNICOS.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <select
              className={selectClass}
              value={value.orientacionFisica}
              onChange={(e) => set({ orientacionFisica: e.target.value })}
            >
              <option value="">Orientación condicional</option>
              {ORIENTACIONES_FISICAS.map((o) => (
                <option key={o.codigo} value={o.codigo}>
                  {o.nombre}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              max={30}
              placeholder="Jug. mín"
              value={value.jugadoresMin}
              onChange={(e) => set({ jugadoresMin: e.target.value })}
              className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-sm"
            />
            <input
              type="number"
              min={1}
              max={30}
              placeholder="Jug. máx"
              value={value.jugadoresMax}
              onChange={(e) => set({ jugadoresMax: e.target.value })}
              className="h-9 w-20 rounded-lg border border-border bg-background px-2 text-sm"
            />
          </>
        )}

        {sortSlot}

        {active && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 h-9 px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  )
}
