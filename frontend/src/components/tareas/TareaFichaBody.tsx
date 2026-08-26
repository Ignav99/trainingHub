'use client'

/**
 * Cuerpo de la ficha de tarea — mismos campos y diseño que «Crea tu ejercicio».
 * Se usa al crear, al ver en biblioteca y al editar en sesión.
 */

import { Info, Plus } from 'lucide-react'
import { Button, Input, Textarea } from '@/components/ui'
import { MultiSelect } from '@/components/ui/multi-select'
import { FaseSubfasePicker } from '@/components/tareas/FaseSubfasePicker'
import {
  CATEGORIAS_CAMPO,
  CATEGORIAS_MARGEN,
  CATEGORIAS_PORTERO,
  CATEGORIAS_TAREA,
  METODOLOGIAS_TAREA,
  OBJETIVOS_TACTICOS,
  OBJETIVOS_TECNICOS,
  ORIENTACIONES_FISICAS,
  TIPOS_VARIANTE,
} from '@/lib/catalogos/canonico'
import {
  GRADO_OPOSICION,
  EJECUTANTES_SIMULTANEOS,
  type ComplejidadScore,
} from '@/lib/complejidadSiate'
import type { SpaceClassification } from '@/lib/tacticalMetrics'
import type { TareaCreatorData, TareaFichaVariant } from '@/lib/tareaFicha'
import { combineDescanso, splitDescanso } from '@/lib/tareaDescanso'
import { cn } from '@/lib/utils'

export function categoriasForVariant(variant: TareaFichaVariant) {
  if (variant === 'margen') return CATEGORIAS_MARGEN
  if (variant === 'portero') return CATEGORIAS_PORTERO
  if (variant === 'all') return CATEGORIAS_TAREA
  return CATEGORIAS_CAMPO
}

const selectClass =
  'flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70'

export interface TareaFichaBodyProps {
  form: TareaCreatorData
  onChange: <K extends keyof TareaCreatorData>(key: K, value: TareaCreatorData[K]) => void
  onPatch: (patch: Partial<TareaCreatorData>) => void
  variant?: TareaFichaVariant
  readOnly?: boolean
  isVariante?: boolean
  madreTitulo?: string
  complejidad: ComplejidadScore
  load: SpaceClassification | null
  etiquetaDraft: string
  onEtiquetaDraft: (v: string) => void
  onAddEtiqueta: () => void
  /** Oculta desarrollo / reglas / anotaciones (p. ej. ya van al lado de la pizarra). */
  hideNarrativa?: boolean
  /** Oculta solo desarrollo y reglas; deja anotaciones (resumen de sesión). */
  hideDesarrolloReglas?: boolean
  /** Oculta series / min / descanso (p. ej. ya van en la cabecera de sesión). */
  hideVolumen?: boolean
  /** Oculta el título (p. ej. ya va en la cabecera de sesión). */
  hideTitulo?: boolean
}

export default function TareaFichaBody({
  form,
  onChange,
  onPatch,
  variant = 'campo',
  readOnly = false,
  isVariante = false,
  madreTitulo,
  complejidad,
  load,
  etiquetaDraft,
  onEtiquetaDraft,
  onAddEtiqueta,
  hideNarrativa = false,
  hideDesarrolloReglas = false,
  hideVolumen = false,
  hideTitulo = false,
}: TareaFichaBodyProps) {
  const categorias = categoriasForVariant(variant)
  const showFaseJuego = variant === 'campo' || variant === 'portero' || variant === 'all'
  const nombreCategoria = categorias.find((c) => c.codigo === form.categoria_id)?.nombre || ''
  const descansoParts = splitDescanso(form.tiempo_descanso)

  const toggleOrientacion = (codigo: string) => {
    if (readOnly) return
    const has = form.orientaciones_fisicas.includes(codigo)
    onChange(
      'orientaciones_fisicas',
      has ? form.orientaciones_fisicas.filter((c) => c !== codigo) : [...form.orientaciones_fisicas, codigo]
    )
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-primary">Tipo de tarea y metodología</h2>
        {!hideTitulo && (
          <Field label="Título">
            <Input
              value={form.titulo}
              onChange={(e) => onChange('titulo', e.target.value)}
              placeholder={nombreCategoria || 'Nombre del ejercicio'}
              readOnly={readOnly}
              disabled={readOnly}
            />
          </Field>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Tipo de tarea" required>
            <select
              className={selectClass}
              value={form.categoria_id || ''}
              onChange={(e) => onChange('categoria_id', e.target.value || undefined)}
              disabled={readOnly}
            >
              <option value="">Seleccionar tipo…</option>
              {categorias.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Metodología" required>
            <select
              className={selectClass}
              value={form.modalidad || ''}
              onChange={(e) => onChange('modalidad', e.target.value || undefined)}
              disabled={readOnly}
            >
              <option value="">Seleccionar…</option>
              {METODOLOGIAS_TAREA.map((m) => (
                <option key={m.codigo} value={m.codigo}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Jugadores" hint="Se sincroniza con monigotes de la pizarra si los hay.">
            <select
              className={selectClass}
              value={String(form.num_jugadores_min)}
              onChange={(e) => onChange('num_jugadores_min', parseInt(e.target.value) || 0)}
              disabled={readOnly}
            >
              {Array.from({ length: 30 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Porteros">
            <select
              className={selectClass}
              value={String(form.num_porteros)}
              onChange={(e) => onChange('num_porteros', parseInt(e.target.value) || 0)}
              disabled={readOnly}
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {showFaseJuego && (
          <FaseSubfasePicker
            disabled={readOnly}
            value={{
              fase_juego: form.fase_juego,
              principio_tactico: form.principio_tactico,
              subprincipio_tactico: form.subprincipio_tactico,
            }}
            onChange={(patch) =>
              onPatch({
                fase_juego: patch.fase_juego,
                principio_tactico: patch.principio_tactico,
                subprincipio_tactico: patch.subprincipio_tactico,
              })
            }
          />
        )}

        {isVariante && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2.5 space-y-2">
            <p className="text-xs text-amber-900">
              Variante de <span className="font-semibold">{madreTitulo || 'tarea madre'}</span>
              — la pizarra y la tipología ya vienen copiadas; ajusta reglas u objetivos.
            </p>
            <Field label="Tipo de variante">
              <select
                className={selectClass}
                value={form.tipo_variante || 'adaptacion'}
                onChange={(e) => onChange('tipo_variante', e.target.value)}
                disabled={readOnly}
              >
                {TIPOS_VARIANTE.filter((t) => t.codigo !== 'original').map((t) => (
                  <option key={t.codigo} value={t.codigo}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {!hideNarrativa && !hideDesarrolloReglas && (
          <>
            <Field label="Desarrollo" hint="Qué se hace en la tarea: organización, roles, cómo arranca y acaba.">
              <Textarea
                value={form.desarrollo || ''}
                onChange={(e) => onChange('desarrollo', e.target.value)}
                placeholder="Ej: 4vs4+3 en espacio reducido. El comodín juega con el poseedor. Cambio cada 2 min…"
                rows={4}
                readOnly={readOnly}
                disabled={readOnly}
              />
            </Field>
            <Field label="Variantes / reglas" hint="Reglas, condicionantes y puntuación de esta versión.">
              <Textarea
                value={form.reglas || ''}
                onChange={(e) => onChange('reglas', e.target.value)}
                placeholder="Ej: Máximo 2 toques. Gol en portería pequeña vale doble. Si recuperan, contraataque a 5 s…"
                rows={3}
                readOnly={readOnly}
                disabled={readOnly}
              />
            </Field>
          </>
        )}
        {!hideNarrativa && (
          <Field label="Anotaciones (opcional)" hint="Errores comunes, tips de coaching, matices.">
            <Textarea
              value={form.anotaciones || ''}
              onChange={(e) => onChange('anotaciones', e.target.value)}
              placeholder="Ej: Evitar que el comodín se quede estático. Corregir orientación corporal al recibir…"
              rows={2}
              readOnly={readOnly}
              disabled={readOnly}
            />
          </Field>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-primary">Objetivos tácticos y técnicos</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <Field label="Objetivos tácticos">
            <MultiSelect
              options={OBJETIVOS_TACTICOS}
              value={form.objetivos_tacticos}
              onChange={(v) => onChange('objetivos_tacticos', v)}
              placeholder="Objetivos tácticos"
              disabled={readOnly}
            />
          </Field>
          <Field label="Objetivos técnicos">
            <MultiSelect
              options={OBJETIVOS_TECNICOS}
              value={form.objetivos_tecnicos}
              onChange={(v) => onChange('objetivos_tecnicos', v)}
              placeholder="Objetivos técnicos"
              disabled={readOnly}
              allowCustom
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-primary">Complejidad (SIATE)</h2>
        <p className="text-xs text-muted-foreground -mt-2">
          Puntuación 6–30 a partir de oposición, densidad, simultaneidad, competitividad, espacio e implicación cognitiva.
          Densidad, espacio y cognitivo salen de la pizarra; competitividad de la metodología.
        </p>

        <div className="rounded-xl border bg-muted/30 p-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Carga de la tarea</p>
            <p className="text-2xl font-bold tabular-nums mt-0.5">
              {complejidad.total}
              <span className="text-sm font-medium text-muted-foreground"> / 30</span>
            </p>
            <p className="text-sm text-foreground/80">{form.complejidad || complejidad.etiqueta}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {complejidad.factores.map((f) => (
              <span
                key={f.key}
                title={f.detalle}
                className={cn(
                  'rounded-md border px-2 py-1 text-[11px]',
                  f.origen === 'auto' ? 'bg-background text-muted-foreground' : 'bg-primary/10 text-primary border-primary/30'
                )}
              >
                {f.nombre.split(' ')[0]} {f.valor}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Grado de oposición" hint="Ajuste manual (SIATE · GO).">
            <select
              className={selectClass}
              value={form.complejidad_go ?? ''}
              onChange={(e) => onChange('complejidad_go', e.target.value ? parseInt(e.target.value) : undefined)}
              disabled={readOnly}
            >
              <option value="">Auto (desde metodología)</option>
              {GRADO_OPOSICION.map((g) => (
                <option key={g.codigo} value={g.codigo}>
                  {g.codigo} · {g.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ejecutantes simultáneos" hint="Ajuste manual (SIATE · PES).">
            <select
              className={selectClass}
              value={form.complejidad_pes ?? ''}
              onChange={(e) => onChange('complejidad_pes', e.target.value ? parseInt(e.target.value) : undefined)}
              disabled={readOnly}
            >
              <option value="">Auto (61–80%)</option>
              {EJECUTANTES_SIMULTANEOS.map((g) => (
                <option key={g.codigo} value={g.codigo}>
                  {g.codigo} · {g.nombre}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-primary">Orientación física</h2>
        <div className="flex flex-wrap gap-2">
          {ORIENTACIONES_FISICAS.map((o) => {
            const active = form.orientaciones_fisicas.includes(o.codigo)
            return (
              <button
                key={o.codigo}
                type="button"
                disabled={readOnly}
                onClick={() => toggleOrientacion(o.codigo)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted',
                  readOnly && !active && 'opacity-50',
                  readOnly && 'cursor-default'
                )}
              >
                {o.nombre}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {form.etiquetas_fisicas.map((e) => (
            <button
              key={e}
              type="button"
              disabled={readOnly}
              onClick={() =>
                onChange(
                  'etiquetas_fisicas',
                  form.etiquetas_fisicas.filter((x) => x !== e)
                )
              }
              className={cn(
                'rounded-md bg-muted px-2 py-1 text-xs',
                !readOnly && 'hover:bg-destructive/10'
              )}
            >
              {e}
              {!readOnly && ' ×'}
            </button>
          ))}
          {!readOnly && (
            <>
              <Input
                value={etiquetaDraft}
                onChange={(e) => onEtiquetaDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onAddEtiqueta()
                  }
                }}
                placeholder="Etiqueta PF"
                className="h-9 w-40"
              />
              <Button type="button" variant="outline" size="sm" onClick={onAddEtiqueta}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-primary">Volumen y carga</h2>
        {!hideVolumen && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Series">
              <Input
                type="number"
                min={1}
                value={form.num_series}
                onChange={(e) => onChange('num_series', parseInt(e.target.value) || 1)}
                readOnly={readOnly}
                disabled={readOnly}
              />
            </Field>
            <Field label="Minutos / serie">
              <Input
                type="number"
                min={1}
                value={form.duracion_serie}
                onChange={(e) => onChange('duracion_serie', parseInt(e.target.value) || 1)}
                readOnly={readOnly}
                disabled={readOnly}
              />
            </Field>
            <Field
              label="Descanso"
              hint="Entre series. Minutos y/o segundos (p. ej. 30 s o 1 min 15 s)."
            >
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={descansoParts.minutes}
                  onChange={(e) =>
                    onChange(
                      'tiempo_descanso',
                      combineDescanso(parseInt(e.target.value, 10) || 0, descansoParts.seconds),
                    )
                  }
                  readOnly={readOnly}
                  disabled={readOnly}
                  aria-label="Descanso en minutos"
                  className="h-9"
                />
                <span className="text-xs text-muted-foreground shrink-0">min</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  inputMode="numeric"
                  value={descansoParts.seconds}
                  onChange={(e) => {
                    const raw = parseInt(e.target.value, 10) || 0
                    onChange('tiempo_descanso', combineDescanso(descansoParts.minutes, raw))
                  }}
                  readOnly={readOnly}
                  disabled={readOnly}
                  aria-label="Descanso en segundos"
                  className="h-9"
                />
                <span className="text-xs text-muted-foreground shrink-0">s</span>
              </div>
            </Field>
          </div>
        )}

        <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Desde la pizarra (automático)
          </p>
          {load || form.espacio_largo ? (
            <div className="flex flex-wrap gap-2 text-sm">
              {(form.espacio_largo || form.espacio_ancho) && (
                <Chip>
                  {form.espacio_largo}×{form.espacio_ancho} m
                </Chip>
              )}
              {(load?.m2PorJugador || form.m2_por_jugador) && (
                <Chip>{load?.m2PorJugador ?? form.m2_por_jugador} m²/jugador</Chip>
              )}
              {load?.etiqueta && <Chip>Espacio {load.etiqueta.toLowerCase()}</Chip>}
              {(load?.densidad || form.densidad) && (
                <Chip>Densidad {load?.densidad || form.densidad}</Chip>
              )}
              <Chip>
                Cognitivo{' '}
                {(() => {
                  const n = load?.nivelCognitivo ?? form.nivel_cognitivo
                  return n === 1 ? 'bajo' : n === 2 ? 'medio' : n === 3 ? 'alto' : '—'
                })()}
              </Chip>
              {(load?.capacidad.nombre || form.tipo_esfuerzo) && (
                <Chip>{load?.capacidad.nombre || form.tipo_esfuerzo}</Chip>
              )}
              {(load?.fcEsperada || (form.fc_esperada_min && form.fc_esperada_max)) && (
                <Chip>
                  {load ? `${load.fcEsperada[0]}–${load.fcEsperada[1]}` : `${form.fc_esperada_min}–${form.fc_esperada_max}`} ppm
                </Chip>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {readOnly
                ? 'Esta tarea no tiene zona en la pizarra: no hay carga espacial calculada.'
                : 'Dibuja una zona en la pizarra: el espacio, la densidad y el nivel cognitivo se rellenan solos.'}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs font-medium text-foreground mb-1">
        {label}
        {required && <span className="text-destructive">*</span>}
        {hint && (
          <span title={hint} className="text-muted-foreground cursor-help">
            <Info className="h-3 w-3" />
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-background border px-2.5 py-1 text-xs font-medium">
      {children}
    </span>
  )
}
