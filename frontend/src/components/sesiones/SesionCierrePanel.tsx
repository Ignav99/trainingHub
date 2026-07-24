'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  FileText,
  Loader2,
  Download,
  Eye,
  Link2,
  Copy,
  Flag,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { EstadoSesion, SesionTarea } from '@/types'

export function SesionCierrePanel({
  sesionId,
  estado,
  tareas = [],
  cargaSesion,
  intensidadCalculada,
  shareToken,
  shareUrl,
  onCerrarPlanificacion,
  onEnableShare,
  onPreviewPdf,
  onDownloadPdf,
  previewingPdf,
  generatingPdf,
}: {
  sesionId: string
  estado: EstadoSesion
  /** @deprecated checklist visual eliminado; se mantiene opcional por compat */
  checklist?: {
    hasObjetivo?: boolean
    hasTareas?: boolean
    asistenciaSaved?: boolean
    presentes?: number
    isPlanificada?: boolean
    isCompletada?: boolean
  }
  tareas?: SesionTarea[]
  cargaSesion?: number | null
  intensidadCalculada?: string | null
  shareToken?: string | null
  shareUrl?: string | null
  onCerrarPlanificacion: () => Promise<void>
  onEnableShare: () => Promise<void>
  onPreviewPdf: (variant: 'reducido' | 'extendido') => void
  onDownloadPdf: (variant: 'reducido' | 'extendido') => void
  previewingPdf?: boolean
  generatingPdf?: boolean
}) {
  const [closing, setClosing] = useState(false)
  const [sharing, setSharing] = useState(false)

  const isCompletada = estado === 'completada'
  const isPlanificada = estado === 'planificada'

  const handleCerrar = async () => {
    if (isCompletada || isPlanificada) return
    setClosing(true)
    try {
      await onCerrarPlanificacion()
      toast.success('Planificación cerrada → planificada')
    } catch {
      toast.error('No se pudo cerrar la planificación')
    } finally {
      setClosing(false)
    }
  }

  const handleShare = async () => {
    setSharing(true)
    try {
      await onEnableShare()
      toast.success('Enlace compartible listo')
    } catch {
      toast.error('No se pudo generar el enlace')
    } finally {
      setSharing(false)
    }
  }

  const copyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Enlace copiado')
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-lg bg-muted px-2.5 py-1 tabular-nums">
          Carga {cargaSesion != null ? cargaSesion : '—'}
        </span>
        <span className="rounded-lg bg-muted px-2.5 py-1">
          Intensidad {intensidadCalculada || '—'}
        </span>
        <span className="rounded-lg bg-muted px-2.5 py-1 capitalize">
          {estado}
        </span>
      </div>

      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold">Carga por tarea</h3>
        <ul className="divide-y">
          {tareas.length === 0 && (
            <li className="py-3 text-sm text-muted-foreground">Sin tareas</li>
          )}
          {tareas.map((t) => (
            <li key={t.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium">
                {t.orden}. {t.tarea?.titulo || 'Tarea'}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {t.duracion_override || t.tarea?.duracion_total || 0} min
                {t.carga_calculada != null ? ` · carga ${t.carga_calculada}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">PDF reducido</p>
              <p className="text-xs text-muted-foreground">1 página vestuario</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onPreviewPdf('reducido')} disabled={previewingPdf}>
              {previewingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDownloadPdf('reducido')} disabled={generatingPdf}>
              {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">PDF extendido</p>
              <p className="text-xs text-muted-foreground">Detalle + pizarra</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onPreviewPdf('extendido')} disabled={previewingPdf}>
              {previewingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDownloadPdf('extendido')} disabled={generatingPdf}>
              {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Enlace compartible</p>
            <p className="text-xs text-muted-foreground truncate">
              {shareUrl || (shareToken ? `token ${shareToken.slice(0, 8)}…` : 'Aún no generado')}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleShare} disabled={sharing}>
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generar'}
          </Button>
          <Button variant="outline" size="icon" onClick={copyLink} disabled={!shareUrl} title="Copiar">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
        {isCompletada ? (
          <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 px-4 py-2.5 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Sesión completada
          </div>
        ) : isPlanificada ? (
          <div className="inline-flex items-center gap-2 rounded-xl bg-sky-100 text-sky-900 border border-sky-200 px-4 py-2.5 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Planificación cerrada
          </div>
        ) : (
          <Button
            size="lg"
            onClick={handleCerrar}
            disabled={closing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {closing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Flag className="h-4 w-4 mr-2" />}
            Cerrar planificación
          </Button>
        )}
        <p className="text-[11px] text-muted-foreground sm:ml-auto tabular-nums">
          Sesión {sesionId.slice(0, 8)}…
        </p>
      </div>
    </div>
  )
}
