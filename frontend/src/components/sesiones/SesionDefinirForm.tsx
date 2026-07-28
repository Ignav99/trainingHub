'use client'

import { useMemo, useRef, useState } from 'react'
import { X, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  FASES_JUEGO,
  SUBFASES_ATAQUE,
  SUBFASES_DEFENSA,
  TIPOS_ABP,
  CONTENIDOS_OFENSIVOS,
  CONTENIDOS_DEFENSIVOS,
  MATCH_DAYS,
  DIAS_CARGA,
  CONTEXTOS_PERIODO,
} from '@/lib/catalogos/canonico'
import { MultiSelect } from '@/components/ui/multi-select'
import { normalizeKeyword, synthesizeKeywords } from '@/lib/keywords'
import type { SesionAbpConfig, SesionSubfaseItem } from '@/types'

/** Normaliza abp_config legacy (lado/lados+tipos) → ofensivo/defensivo. */
function normalizeAbp(raw: SesionAbpConfig | null | undefined): SesionAbpConfig {
  const base = raw || { activo: false }
  let ofensivo = [...(base.ofensivo || [])]
  let defensivo = [...(base.defensivo || [])]
  if (!ofensivo.length && !defensivo.length) {
    const tipos = base.tipos || []
    const lados =
      base.lados && base.lados.length
        ? base.lados
        : base.lado
          ? [base.lado]
          : []
    if (tipos.length && lados.length) {
      if (lados.includes('ofensivo')) ofensivo = [...tipos]
      if (lados.includes('defensivo')) defensivo = [...tipos]
    }
  }
  const activo = ofensivo.length > 0 || defensivo.length > 0
  return {
    activo,
    ofensivo,
    defensivo,
    lados: [
      ...(ofensivo.length ? (['ofensivo'] as const) : []),
      ...(defensivo.length ? (['defensivo'] as const) : []),
    ],
    lado: ofensivo.length ? 'ofensivo' : defensivo.length ? 'defensivo' : null,
    tipos: [...new Set([...ofensivo, ...defensivo])],
  }
}

function buildAbp(ofensivo: string[], defensivo: string[]): SesionAbpConfig | null {
  const next = normalizeAbp({ activo: false, ofensivo, defensivo })
  return next.activo ? next : null
}

export type SesionDefinirValues = {
  titulo: string
  fecha: string
  hora?: string
  lugar?: string
  match_day: string
  dia_carga?: string
  contexto_periodo?: string
  es_pretemporada?: boolean
  rival?: string
  competicion?: string
  partido_id?: string | null
  fases_juego: string[]
  subfases: SesionSubfaseItem[]
  abp_config: SesionAbpConfig | null
  contenidos_tecnicos_of: string[]
  contenidos_tecnicos_def: string[]
  objetivo_principal: string
  keywords: string[]
  objetivo_fisico?: string
  objetivo_psicologico?: string
}

function ChipToggle({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-2.5 py-1 text-xs transition-colors',
        active
          ? 'bg-foreground text-background border-foreground'
          : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      {label}
    </button>
  )
}

export function SesionDefinirForm({
  value,
  onChange,
  rivalLocked = false,
  className,
}: {
  value: SesionDefinirValues
  onChange: (patch: Partial<SesionDefinirValues>) => void
  rivalLocked?: boolean
  className?: string
}) {
  const [kwDraft, setKwDraft] = useState('')
  const [ofDraft, setOfDraft] = useState('')
  const [defDraft, setDefDraft] = useState('')
  /** Últimas keywords auto-extraídas del objetivo (para no pisar las manuales). */
  const autoKwRef = useRef<string[]>(synthesizeKeywords(value.objetivo_principal || ''))
  /** Keywords auto que el usuario quitó a mano. */
  const suppressedKwRef = useRef<Set<string>>(new Set())

  const addManualKeyword = (raw: string) => {
    const t = normalizeKeyword(raw)
    if (!t) return
    suppressedKwRef.current.delete(t)
    if (value.keywords.includes(t)) {
      setKwDraft('')
      return
    }
    onChange({ keywords: [...value.keywords, t] })
    setKwDraft('')
  }

  const removeKeyword = (k: string) => {
    if (autoKwRef.current.includes(k)) {
      suppressedKwRef.current.add(k)
    }
    onChange({ keywords: value.keywords.filter((x) => x !== k) })
  }

  const syncKeywordsFromObjetivo = (objetivo_principal: string) => {
    const auto = synthesizeKeywords(objetivo_principal).filter(
      (k) => !suppressedKwRef.current.has(k),
    )
    // limpiar suppressed que ya no salen del objetivo
    for (const s of [...suppressedKwRef.current]) {
      if (!synthesizeKeywords(objetivo_principal).includes(s)) {
        suppressedKwRef.current.delete(s)
      }
    }
    const manual = value.keywords.filter((k) => !autoKwRef.current.includes(k))
    autoKwRef.current = synthesizeKeywords(objetivo_principal)
    const seen = new Set<string>()
    const next: string[] = []
    for (const k of [...auto, ...manual]) {
      if (!seen.has(k)) {
        seen.add(k)
        next.push(k)
      }
    }
    onChange({ objetivo_principal, keywords: next })
  }

  const isPretemporada =
    value.es_pretemporada ||
    value.contexto_periodo === 'pretemporada' ||
    value.contexto_periodo === 'transicion'

  const subfaseCatalog = useMemo(() => {
    const map: Record<string, typeof SUBFASES_ATAQUE | typeof SUBFASES_DEFENSA> = {
      ataque_organizado: SUBFASES_ATAQUE,
      defensa_organizada: SUBFASES_DEFENSA,
    }
    return map
  }, [])

  const toggleFase = (codigo: string) => {
    const has = value.fases_juego.includes(codigo)
    const fases = has
      ? value.fases_juego.filter((f) => f !== codigo)
      : [...value.fases_juego, codigo]
    const subfases = value.subfases.filter((s) => fases.includes(s.fase))
    onChange({ fases_juego: fases, subfases })
  }

  const upsertSubfase = (fase: string, subfase: string, opcion?: string) => {
    const rest = value.subfases.filter((s) => !(s.fase === fase && s.subfase === subfase))
    onChange({ subfases: [...rest, { fase, subfase, opcion: opcion || null }] })
  }

  const removeSubfase = (fase: string, subfase: string) => {
    onChange({
      subfases: value.subfases.filter((s) => !(s.fase === fase && s.subfase === subfase)),
    })
  }

  const abp = normalizeAbp(value.abp_config)

  return (
    <div className={cn('space-y-6', className)}>
      <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
        <h3 className="text-sm font-semibold">Identidad</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Título</Label>
            <Input
              value={value.titulo}
              onChange={(e) => onChange({ titulo: e.target.value })}
              placeholder="Ej. MD-3 presión alta"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={value.fecha}
              onChange={(e) => onChange({ fecha: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Hora</Label>
            <Input
              type="time"
              value={value.hora || ''}
              onChange={(e) => onChange({ hora: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Lugar</Label>
            <Input
              value={value.lugar || ''}
              onChange={(e) => onChange({ lugar: e.target.value })}
              placeholder="Campo, instalación…"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Contexto</Label>
          <div className="flex flex-wrap gap-1.5">
            {CONTEXTOS_PERIODO.map((c) => (
              <ChipToggle
                key={c.codigo}
                active={(value.contexto_periodo || 'competicion') === c.codigo}
                label={c.nombre}
                onClick={() =>
                  onChange({
                    contexto_periodo: c.codigo,
                    es_pretemporada: c.codigo === 'pretemporada',
                  })
                }
              />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{isPretemporada ? 'Día de carga (pretemporada)' : 'Match day'}</Label>
          <div className="flex flex-wrap gap-1.5">
            {(isPretemporada ? DIAS_CARGA : MATCH_DAYS).map((d) => (
              <ChipToggle
                key={d.codigo}
                active={
                  isPretemporada
                    ? value.dia_carga === d.codigo
                    : value.match_day === d.codigo
                }
                label={`${d.codigo} — ${d.nombre}`}
                onClick={() =>
                  isPretemporada
                    ? onChange({ dia_carga: d.codigo })
                    : onChange({ match_day: d.codigo })
                }
              />
            ))}
          </div>
          {isPretemporada && value.dia_carga && (
            <p className="text-xs text-muted-foreground">
              Seleccionado:{' '}
              <span className="font-medium text-foreground">
                {DIAS_CARGA.find((d) => d.codigo === value.dia_carga)?.codigo} —{' '}
                {DIAS_CARGA.find((d) => d.codigo === value.dia_carga)?.nombre}
              </span>
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Rival {rivalLocked ? '(desde partido)' : ''}</Label>
            <Input
              value={value.rival || ''}
              onChange={(e) => onChange({ rival: e.target.value })}
              disabled={rivalLocked && !isPretemporada}
              placeholder={rivalLocked ? 'Correlacionado al partido' : 'Rival'}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Competición</Label>
            <Input
              value={value.competicion || ''}
              onChange={(e) => onChange({ competicion: e.target.value })}
              disabled={rivalLocked && !isPretemporada}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
        <h3 className="text-sm font-semibold">Fases de juego</h3>
        <div className="flex flex-wrap gap-1.5">
          {FASES_JUEGO.filter((f) =>
            ['ataque_organizado', 'defensa_organizada', 'transicion_defensa_ataque', 'transicion_ataque_defensa'].includes(f.codigo)
          ).map((f) => (
            <ChipToggle
              key={f.codigo}
              active={value.fases_juego.includes(f.codigo)}
              label={f.nombre}
              onClick={() => toggleFase(f.codigo)}
            />
          ))}
        </div>

        {value.fases_juego.map((fase) => {
          const catalog = subfaseCatalog[fase]
          if (!catalog) return null
          return (
            <div key={fase} className="rounded-xl border border-dashed p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Subfases · {FASES_JUEGO.find((f) => f.codigo === fase)?.nombre}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {catalog.map((sf) => {
                  const active = value.subfases.some((s) => s.fase === fase && s.subfase === sf.codigo)
                  return (
                    <ChipToggle
                      key={sf.codigo}
                      active={active}
                      label={sf.nombre}
                      onClick={() =>
                        active ? removeSubfase(fase, sf.codigo) : upsertSubfase(fase, sf.codigo)
                      }
                    />
                  )
                })}
              </div>
              {catalog.map((sf) => {
                if (!sf.opciones?.length) return null
                const selected = value.subfases.find((s) => s.fase === fase && s.subfase === sf.codigo)
                if (!selected) return null
                return (
                  <div key={`${sf.codigo}-opts`} className="flex flex-wrap gap-1.5 pl-1">
                    <span className="text-[10px] text-muted-foreground self-center">{sf.nombre}:</span>
                    {sf.opciones.map((op) => (
                      <ChipToggle
                        key={op.codigo}
                        active={selected.opcion === op.codigo}
                        label={op.nombre}
                        onClick={() => upsertSubfase(fase, sf.codigo, op.codigo)}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })}
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
        <div>
          <h3 className="text-sm font-semibold">ABP (opcional)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Elige tipos por lado; puedes usar uno, los dos o ninguno.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Ofensivo</Label>
            <MultiSelect
              options={TIPOS_ABP}
              value={abp.ofensivo || []}
              onChange={(ofensivo) =>
                onChange({
                  abp_config: buildAbp(ofensivo, abp.defensivo || []),
                })
              }
              placeholder="Tipos ofensivos…"
              maxChips={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Defensivo</Label>
            <MultiSelect
              options={TIPOS_ABP}
              value={abp.defensivo || []}
              onChange={(defensivo) =>
                onChange({
                  abp_config: buildAbp(abp.ofensivo || [], defensivo),
                })
              }
              placeholder="Tipos defensivos…"
              maxChips={3}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
        <h3 className="text-sm font-semibold">Contenidos técnicos</h3>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Ofensivos</Label>
          <div className="flex flex-wrap gap-1.5">
            {CONTENIDOS_OFENSIVOS.slice(0, 12).map((c) => {
              const on = value.contenidos_tecnicos_of.includes(c.codigo)
              return (
                <ChipToggle
                  key={c.codigo}
                  active={on}
                  label={c.nombre}
                  onClick={() =>
                    onChange({
                      contenidos_tecnicos_of: on
                        ? value.contenidos_tecnicos_of.filter((x) => x !== c.codigo)
                        : [...value.contenidos_tecnicos_of, c.codigo],
                    })
                  }
                />
              )
            })}
          </div>
          <div className="flex gap-2">
            <Input
              value={ofDraft}
              onChange={(e) => setOfDraft(e.target.value)}
              placeholder="Chip libre ofensivo"
              className="h-8"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const t = ofDraft.trim()
                if (!t) return
                onChange({ contenidos_tecnicos_of: [...value.contenidos_tecnicos_of, t] })
                setOfDraft('')
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Defensivos</Label>
          <div className="flex flex-wrap gap-1.5">
            {CONTENIDOS_DEFENSIVOS.slice(0, 12).map((c) => {
              const on = value.contenidos_tecnicos_def.includes(c.codigo)
              return (
                <ChipToggle
                  key={c.codigo}
                  active={on}
                  label={c.nombre}
                  onClick={() =>
                    onChange({
                      contenidos_tecnicos_def: on
                        ? value.contenidos_tecnicos_def.filter((x) => x !== c.codigo)
                        : [...value.contenidos_tecnicos_def, c.codigo],
                    })
                  }
                />
              )
            })}
          </div>
          <div className="flex gap-2">
            <Input
              value={defDraft}
              onChange={(e) => setDefDraft(e.target.value)}
              placeholder="Chip libre defensivo"
              className="h-8"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const t = defDraft.trim()
                if (!t) return
                onChange({ contenidos_tecnicos_def: [...value.contenidos_tecnicos_def, t] })
                setDefDraft('')
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
        <h3 className="text-sm font-semibold">Objetivos</h3>
        <div className="space-y-1.5">
          <Label>Objetivo principal</Label>
          <Textarea
            value={value.objetivo_principal}
            onChange={(e) => syncKeywordsFromObjetivo(e.target.value)}
            rows={3}
            placeholder="Qué queremos conseguir hoy…"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Keywords</Label>
          <p className="text-[11px] text-muted-foreground">
            Se generan frases desde el objetivo (p.ej. «presión alta»). Puedes añadir o quitar.
          </p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {value.keywords.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
              >
                {k}
                <button
                  type="button"
                  onClick={() => removeKeyword(k)}
                  aria-label={`Quitar ${k}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={kwDraft}
              onChange={(e) => setKwDraft(e.target.value)}
              placeholder="Añadir frase (ej. salida de balón)"
              className="h-8"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addManualKeyword(kwDraft)
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addManualKeyword(kwDraft)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Objetivo físico (opcional)</Label>
            <Input
              value={value.objetivo_fisico || ''}
              onChange={(e) => onChange({ objetivo_fisico: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Objetivo psicológico (opcional)</Label>
            <Input
              value={value.objetivo_psicologico || ''}
              onChange={(e) => onChange({ objetivo_psicologico: e.target.value })}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
