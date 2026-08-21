'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import useSWR from 'swr'
import { FileStack, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AmbitoToggle } from '@/components/estadisticas/AmbitoToggle'
import {
  DEFAULT_SECCIONES,
  INFORME_PLANTILLAS,
  INFORME_SUGERENCIAS,
  SECCION_LABEL,
  informesApi,
  type InformeAsunto,
  type InformeAudiencia,
  type InformeProfundidad,
  type InformeSeccion,
  type InformeSpec,
} from '@/lib/api/informes'
import { useEquipoStore } from '@/stores/equipoStore'
import { useClubStore } from '@/stores/clubStore'
import { apiKey } from '@/lib/swr'
import { AMBITO_COMPETICION, ambitoLabel, type PartidoAmbito } from '@/lib/partidoAmbito'
import { cn } from '@/lib/utils'
import type { Jugador, Microciclo, PaginatedResponse } from '@/types'

const AUDIENCIA_LABEL: Record<InformeAudiencia, string> = {
  cuerpo_tecnico: 'Cuerpo técnico',
  metodologia: 'Metodología',
  direccion: 'Dirección',
  staff: 'Staff',
}

const PROF_LABEL: Record<InformeProfundidad, string> = {
  breve: 'Breve',
  estandar: 'Estándar',
  extendido: 'Extendido',
}

const PROF_HINT: Record<InformeProfundidad, string> = {
  breve: 'Una hoja. Cifras y lectura corta.',
  estandar: 'Tablas del periodo y lectura.',
  extendido: 'Histórico, local/visitante y lectura larga.',
}

const LIMITE_FILAS: Record<InformeProfundidad, number> = {
  breve: 8,
  estandar: 24,
  extendido: 200,
}

function emptySpec(): InformeSpec {
  return {
    asunto: 'temporada',
    profundidad: 'estandar',
    audiencia: 'cuerpo_tecnico',
    ambito: AMBITO_COMPETICION,
    secciones: [...DEFAULT_SECCIONES.temporada],
    fecha_desde: '',
    fecha_hasta: '',
    jugador_id: '',
    microciclo_id: '',
    ultimos_n: null,
    prompt: '',
    notas: '',
    titulo: '',
  }
}

export default function InformesPage() {
  const { equipoActivo } = useEquipoStore()
  const theme = useClubStore((s) => s.theme)
  const organizacion = useClubStore((s) => s.organizacion)
  const [prompt, setPrompt] = useState('')
  const [spec, setSpec] = useState<InformeSpec>(emptySpec)
  const [busy, setBusy] = useState(false)
  const [interpreting, setInterpreting] = useState(false)

  const { data: jugadoresRes } = useSWR<PaginatedResponse<Jugador>>(
    (spec.asunto === 'jugador' || prompt.length > 8) && equipoActivo?.id
      ? apiKey('/jugadores', { equipo_id: equipoActivo.id, limit: 80 }, ['equipo_id'])
      : null
  )
  const { data: microsRes } = useSWR<PaginatedResponse<Microciclo>>(
    spec.asunto === 'microciclo' && equipoActivo?.id
      ? apiKey('/microciclos', { equipo_id: equipoActivo.id, limit: 30 }, ['equipo_id'])
      : null
  )

  const plantilla = useMemo(
    () => INFORME_PLANTILLAS.find((p) => p.id === spec.asunto),
    [spec.asunto]
  )

  const periodoLabel = useMemo(() => {
    if (spec.ultimos_n) return `Últimos ${spec.ultimos_n} partidos`
    if (spec.fecha_desde || spec.fecha_hasta) {
      return `${spec.fecha_desde || 'inicio'} – ${spec.fecha_hasta || 'hoy'}`
    }
    return 'Temporada'
  }, [spec.ultimos_n, spec.fecha_desde, spec.fecha_hasta])

  const patch = (partial: Partial<InformeSpec>) => {
    setSpec((prev) => {
      const next = { ...prev, ...partial }
      if (partial.asunto && partial.asunto !== prev.asunto && !partial.secciones) {
        next.secciones = [...DEFAULT_SECCIONES[partial.asunto]]
      }
      return next
    })
  }

  const toggleSeccion = (id: InformeSeccion) => {
    setSpec((prev) => {
      const has = prev.secciones.includes(id)
      const secciones = has ? prev.secciones.filter((s) => s !== id) : [...prev.secciones, id]
      return { ...prev, secciones: secciones.length ? secciones : prev.secciones }
    })
  }

  const interpretar = async (texto: string) => {
    if (!equipoActivo?.id || texto.trim().length < 3) return
    setInterpreting(true)
    try {
      const res = await informesApi.interpretar(texto.trim(), equipoActivo.id)
      setSpec({
        ...emptySpec(),
        ...res.spec,
        fecha_desde: res.spec.fecha_desde || '',
        fecha_hasta: res.spec.fecha_hasta || '',
        jugador_id: res.spec.jugador_id || '',
        microciclo_id: res.spec.microciclo_id || '',
        notas: res.spec.notas || '',
        titulo: res.spec.titulo || '',
        prompt: texto.trim(),
      })
      toast.success('Pedido interpretado. Revisa el dossier y genera el PDF.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo interpretar el pedido')
    } finally {
      setInterpreting(false)
    }
  }

  const generar = async (preview: boolean) => {
    if (!equipoActivo?.id) {
      toast.error('Selecciona un equipo')
      return
    }
    if (spec.asunto === 'jugador' && !spec.jugador_id) {
      toast.error('Elige un jugador')
      return
    }
    if (spec.asunto === 'microciclo' && !spec.microciclo_id) {
      toast.error('Elige un microciclo')
      return
    }
    setBusy(true)
    try {
      await informesApi.generate({
        ...spec,
        equipo_id: equipoActivo.id,
        fecha_desde: spec.fecha_desde || null,
        fecha_hasta: spec.fecha_hasta || null,
        jugador_id: spec.jugador_id || null,
        microciclo_id: spec.microciclo_id || null,
        prompt: prompt.trim() || spec.prompt || null,
        notas: spec.notas?.trim() || null,
        titulo: spec.titulo?.trim() || null,
        preview,
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo generar el informe')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Informes"
        description="Dossier del club: dices qué hay que enviar — en lenguaje natural o con los controles — y sale un PDF con el escudo. Los amistosos no entran en competición salvo que lo pidas."
      />

      <section className="rounded-xl border bg-card p-4 space-y-3">
        <Label htmlFor="informe-pedido">Qué hay que enviar</Label>
        <Textarea
          id="informe-pedido"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void interpretar(prompt)
            }
          }}
          placeholder="Ej: informe breve de competición para el jefe de metodología, últimos 5 partidos, sin amistosos"
          className="min-h-[96px]"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={interpreting || prompt.trim().length < 3}
            onClick={() => interpretar(prompt)}
          >
            {interpreting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Interpretar pedido
          </Button>
          <span className="text-xs text-muted-foreground self-center">Ctrl+Enter</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {INFORME_SUGERENCIAS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setPrompt(s)
                void interpretar(s)
              }}
              className="text-left text-xs rounded-md border px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <section
          className="rounded-xl border bg-card p-4 sm:p-5"
          style={{ borderTopWidth: 3, borderTopColor: theme.colorPrimario }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: theme.colorPrimario }}
            >
              {theme.logoUrl ? (
                <Image src={theme.logoUrl} alt="" width={32} height={32} className="object-contain" unoptimized />
              ) : (
                <span className="text-sm font-bold text-white">
                  {(organizacion?.nombre || 'K')[0]}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: theme.colorPrimario }}
              >
                Dossier · Para {AUDIENCIA_LABEL[spec.audiencia]}
              </p>
              <p className="text-base font-semibold truncate">
                {spec.titulo?.trim() || plantilla?.nombre}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {organizacion?.nombre || 'Club'}
                {equipoActivo?.nombre ? ` · ${equipoActivo.nombre}` : ''}
                {equipoActivo?.temporada ? ` · ${equipoActivo.temporada}` : ''}
                {' · '}
                {ambitoLabel(spec.ambito)}
                {' · '}
                {PROF_LABEL[spec.profundidad]}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="informe-asunto">Asunto</Label>
              <select
                id="informe-asunto"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={spec.asunto}
                onChange={(e) => patch({ asunto: e.target.value as InformeAsunto })}
              >
                {INFORME_PLANTILLAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} · {p.para}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="informe-audiencia">Para</Label>
              <select
                id="informe-audiencia"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={spec.audiencia}
                onChange={(e) => patch({ audiencia: e.target.value as InformeAudiencia })}
              >
                {(Object.keys(AUDIENCIA_LABEL) as InformeAudiencia[]).map((k) => (
                  <option key={k} value={k}>
                    {AUDIENCIA_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5 mt-4">
            <Label htmlFor="informe-titulo">Título en portada</Label>
            <Input
              id="informe-titulo"
              value={spec.titulo || ''}
              onChange={(e) => patch({ titulo: e.target.value })}
              placeholder={plantilla?.nombre || 'Informe'}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium">Profundidad</p>
              <p className="text-[11px] text-muted-foreground">{PROF_HINT[spec.profundidad]}</p>
            </div>
            <div className="inline-flex rounded-lg border bg-card p-0.5 text-xs" role="radiogroup" aria-label="Profundidad">
              {(Object.keys(PROF_LABEL) as InformeProfundidad[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={spec.profundidad === k}
                  onClick={() => patch({ profundidad: k })}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 font-medium transition-colors',
                    spec.profundidad === k
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {PROF_LABEL[k]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-medium">Ámbito</p>
            <AmbitoToggle
              value={(spec.ambito as PartidoAmbito) || AMBITO_COMPETICION}
              onChange={(ambito) => patch({ ambito })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="informe-n">Últimos N</Label>
              <Input
                id="informe-n"
                type="number"
                min={1}
                max={40}
                placeholder="Todos"
                value={spec.ultimos_n ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  patch({ ultimos_n: v ? Math.min(40, Math.max(1, Number(v))) : null })
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="informe-desde">Desde</Label>
              <Input
                id="informe-desde"
                type="date"
                value={spec.fecha_desde || ''}
                onChange={(e) => patch({ fecha_desde: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="informe-hasta">Hasta</Label>
              <Input
                id="informe-hasta"
                type="date"
                value={spec.fecha_hasta || ''}
                onChange={(e) => patch({ fecha_hasta: e.target.value })}
              />
            </div>
          </div>

          {spec.asunto === 'jugador' && (
            <div className="space-y-1.5 mt-4">
              <Label htmlFor="informe-jugador">Jugador</Label>
              <select
                id="informe-jugador"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={spec.jugador_id || ''}
                onChange={(e) => patch({ jugador_id: e.target.value })}
              >
                <option value="">Seleccionar…</option>
                {(jugadoresRes?.data || []).map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.dorsal ? `${j.dorsal} · ` : ''}
                    {j.nombre} {j.apellidos}
                  </option>
                ))}
              </select>
            </div>
          )}

          {spec.asunto === 'microciclo' && (
            <div className="space-y-1.5 mt-4">
              <Label htmlFor="informe-micro">Microciclo</Label>
              <select
                id="informe-micro"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={spec.microciclo_id || ''}
                onChange={(e) => patch({ microciclo_id: e.target.value })}
              >
                <option value="">Seleccionar…</option>
                {(microsRes?.data || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fecha_inicio} – {m.fecha_fin}
                    {m.objetivo_principal ? ` · ${m.objetivo_principal}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-4">
            <p className="text-xs font-medium mb-2">Bloques del PDF</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(SECCION_LABEL) as InformeSeccion[]).map((id) => {
                const on = spec.secciones.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleSeccion(id)}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs font-medium',
                      on ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {SECCION_LABEL[id]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5 mt-4">
            <Label htmlFor="informe-notas">Notas del cuerpo técnico</Label>
            <Textarea
              id="informe-notas"
              value={spec.notas || ''}
              onChange={(e) => patch({ notas: e.target.value })}
              placeholder="Opcional. Entran al final del dossier, tal cual las escribas."
              className="min-h-[72px]"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-4">
            <Button type="button" onClick={() => generar(false)} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileStack className="h-4 w-4 mr-1" />}
              Descargar PDF
            </Button>
            <Button type="button" variant="outline" onClick={() => generar(true)} disabled={busy}>
              Vista previa
            </Button>
          </div>
        </section>

        <aside className="rounded-xl border bg-card p-4 lg:sticky lg:top-20 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Este dossier
          </p>
          <ul className="text-sm space-y-1.5">
            <li><span className="text-muted-foreground">Para</span> {AUDIENCIA_LABEL[spec.audiencia]}</li>
            <li><span className="text-muted-foreground">Asunto</span> {plantilla?.nombre}</li>
            <li><span className="text-muted-foreground">Ámbito</span> {ambitoLabel(spec.ambito)}</li>
            <li><span className="text-muted-foreground">Periodo</span> {periodoLabel}</li>
            <li>
              <span className="text-muted-foreground">Profundidad</span> {PROF_LABEL[spec.profundidad]}
              <span className="text-muted-foreground"> · hasta {LIMITE_FILAS[spec.profundidad]} filas</span>
            </li>
          </ul>
          <div>
            <p className="text-xs font-medium mb-1.5">Entra en el PDF</p>
            <ol className="text-xs space-y-1 text-muted-foreground">
              {spec.secciones.map((id) => (
                <li key={id}>{SECCION_LABEL[id]}</li>
              ))}
              {spec.notas?.trim() ? <li>Notas del CT</li> : null}
            </ol>
          </div>
          {spec.asunto === 'jugador' && !spec.jugador_id ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">Falta el jugador.</p>
          ) : null}
          {spec.asunto === 'microciclo' && !spec.microciclo_id ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">Falta el microciclo.</p>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
