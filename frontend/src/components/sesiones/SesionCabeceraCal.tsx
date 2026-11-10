'use client'

import { ChevronDown, Download, Eye, Loader2, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Estado, type EstadoTipo } from '@/components/ui/estado'
import { MD_COLOR, safe } from '@/components/sesiones/SesionesTablaCal'
import { DIAS_CARGA } from '@/lib/catalogos/canonico'
import type { EstadoSesion, Sesion } from '@/types'

interface Props {
  sesion: Sesion
  matchDays: string[]
  minutos: number
  tareas: number
  jugadores?: number
  autoSaving: boolean
  previewingPdf: boolean
  generatingPdf: boolean
  deleting: boolean
  onField: (field: string, value: string | null) => void
  onEstado: (estado: EstadoSesion) => void
  onPreviewPdf: () => void
  onPdf: () => void
  onDelete: () => void
}

const ESTADO: Record<string, { tipo: EstadoTipo; texto: string }> = {
  borrador: { tipo: 'neutro', texto: 'Borrador' },
  planificada: { tipo: 'aviso', texto: 'Planificada' },
  completada: { tipo: 'disponible', texto: 'Completada' },
  cancelada: { tipo: 'baja', texto: 'Cancelada' },
}

function Cifra({ valor, unidad, rotulo }: { valor: number | string; unidad?: string; rotulo: string }) {
  return (
    <div className="min-w-0">
      <p className="cal-rotulo text-muted-foreground">{rotulo}</p>
      <p className="cal-titulo mt-1 text-3xl tabular-nums text-foreground">
        {valor}
        {unidad && <span className="ml-1 text-sm font-semibold text-muted-foreground">{unidad}</span>}
      </p>
    </div>
  )
}

/** Cabecera de la sesión en Cal: datos editables a la izquierda, cifras y acciones a la derecha. */
export function SesionCabeceraCal({
  sesion,
  matchDays,
  minutos,
  tareas,
  jugadores,
  autoSaving,
  previewingPdf,
  generatingPdf,
  deleting,
  onField,
  onEstado,
  onPreviewPdf,
  onPdf,
  onDelete,
}: Props) {
  const est = ESTADO[sesion.estado] || ESTADO.borrador
  const fechaLarga = safe(() => format(parseISO(sesion.fecha), "EEEE d 'de' MMMM", { locale: es }), sesion.fecha)
  const esPre = !!(sesion.es_pretemporada || sesion.contexto_periodo === 'pretemporada')
  const conDiaCarga = esPre || sesion.contexto_periodo === 'transicion'
  const campo =
    'h-11 rounded-[var(--radius)] border border-transparent bg-transparent px-1 text-sm hover:border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary'

  return (
    <section className="cal-linea bg-card mb-6 grid grid-cols-1 lg:grid-cols-carriles" aria-label="Sesión">
      <div className="min-w-0 p-4 sm:p-5 lg:col-span-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="cal-rotulo text-muted-foreground first-letter:uppercase">{fechaLarga}</p>
          <span className="inline-flex items-center gap-2 font-mono text-xs">
            <span aria-hidden="true" className={`inline-block h-2 w-2 flex-none ${MD_COLOR[sesion.match_day] || 'bg-muted-foreground'}`} />
            <select
              aria-label="Match day"
              className={`${campo} h-9 font-mono text-xs`}
              value={sesion.match_day}
              onChange={(e) => onField('match_day', e.target.value)}
            >
              {matchDays.map((md) => (
                <option key={md} value={md}>
                  {md}
                </option>
              ))}
            </select>
          </span>
          {sesion.numero_sesion ? <span className="cal-rotulo text-muted-foreground">Sesión {sesion.numero_sesion}</span> : null}
          {esPre ? (
            <span className="cal-rotulo text-warning">Pretemporada</span>
          ) : sesion.contexto_periodo === 'transicion' ? (
            <span className="cal-rotulo text-muted-foreground">Transición</span>
          ) : null}
          {conDiaCarga && (
            <select
              aria-label="Día de carga (pretemporada)"
              className={`${campo} h-9 font-mono text-xs`}
              value={sesion.dia_carga || ''}
              onChange={(e) => onField('dia_carga', e.target.value)}
            >
              <option value="">Día de carga…</option>
              {DIAS_CARGA.map((d) => (
                <option key={d.codigo} value={d.codigo}>
                  {d.codigo} — {d.nombre}
                </option>
              ))}
            </select>
          )}
          {autoSaving && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Guardando…
            </span>
          )}
        </div>
        <input
          aria-label="Título de la sesión"
          className="cal-titulo mt-2 w-full min-w-0 rounded-[var(--radius)] border border-transparent bg-transparent px-1 py-1 text-2xl text-foreground hover:border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:text-3xl"
          value={sesion.titulo}
          onChange={(e) => onField('titulo', e.target.value)}
        />
        {sesion.objetivo_principal && (
          <p className="mt-2 line-clamp-2 px-1 text-sm text-muted-foreground">{sesion.objetivo_principal}</p>
        )}
        {sesion.rival && <p className="mt-1 px-1 text-sm text-foreground">Rival de la semana: {sesion.rival}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <label className="relative inline-flex h-11 items-center text-sm font-semibold focus-within:outline focus-within:outline-2 focus-within:outline-primary">
            <Estado tipo={est.tipo}>{est.texto}</Estado>
            <ChevronDown className="ml-1 h-4 w-4 flex-none text-muted-foreground" aria-hidden="true" />
            <select
              aria-label="Cambiar estado"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              value={sesion.estado}
              onChange={(e) => onEstado(e.target.value as EstadoSesion)}
            >
              <option value="borrador">Borrador</option>
              <option value="planificada">Planificada</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </label>
          <input
            type="date"
            aria-label="Fecha"
            className={`${campo} tabular-nums`}
            value={sesion.fecha}
            onChange={(e) => onField('fecha', e.target.value)}
          />
          <input
            type="time"
            aria-label="Hora"
            className={`${campo} w-28 tabular-nums`}
            value={sesion.hora || ''}
            onChange={(e) => onField('hora', e.target.value || null)}
          />
        </div>
      </div>
      <div className="flex min-w-0 flex-col justify-between gap-4 border-t border-border p-4 sm:p-5 lg:col-span-2 lg:border-l lg:border-t-0">
        <div className="grid grid-cols-3 gap-3">
          <Cifra rotulo="Duración" valor={minutos} unidad="min" />
          <Cifra rotulo="Tareas" valor={tareas} />
          {jugadores != null && jugadores > 0 && <Cifra rotulo="Jugadores" valor={jugadores} />}
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Button className="min-h-11" onClick={onPdf} disabled={generatingPdf}>
            {generatingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Descargar PDF
          </Button>
          <Button variant="outline" size="icon" className="h-11 w-11" onClick={onPreviewPdf} disabled={previewingPdf} aria-label="Vista previa del PDF reducido">
            {previewingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" className="h-11 w-11 text-destructive" onClick={onDelete} disabled={deleting} aria-label="Eliminar sesión">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </section>
  )
}
