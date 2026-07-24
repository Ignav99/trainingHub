'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  Circle,
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
import { cn } from '@/lib/utils'
import type { EstadoSesion, SesionTarea } from '@/types'

type Checklist = {
  hasObjetivo: boolean
  hasTareas: boolean
  asistenciaSaved: boolean
  presentes: number
  isPlanificada: boolean
  isCompletada: boolean
}

export function SesionCierrePanel({
  sesionId,
  estado,
  checklist,
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
  checklist: Checklist
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

  const items = [
    { ok: checklist.hasObjetivo, label: 'Objetivo / keywords definidos' },
    { ok: checklist.hasTareas, label: 'Al menos una tarea en el diseño' },
    {
      ok: checklist.asistenciaSaved && checklist.presentes > 0,
      label: checklist.presentes > 0
        ? `Convocatoria con ${checklist.presentes} presentes`
        : 'Convocatoria guardada con presentes',
    },
  ]

  const ready =
    checklist.hasObjetivo &&
    checklist.hasTareas &&
    checklist.asistenciaSaved &&
    checklist.presentes > 0

  const handleCerrar = async () => {
    if (checklist.isCompletada || checklist.isPlanificada) return
    if (!ready) {
      toast.error('Completa objetivo, tareas y convocatoria antes de cerrar planificación')
      return
    }
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
      <div className="rounded-2xl border bg-gradient-to-br from-emerald-50/80 via-card to-sky-50/40 p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight">Cierre de planificación</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Resume la sesión, exporta PDF, comparte el enlace y cierra como planificada.
          Si la fecha ya pasó, el sistema la marcará completada y aplicará cargas.
        </p>

        <ul className="mt-5 space-y-2.5">
          {items.map((item) => (
            <li key={item.label} className="flex items-start gap-2.5 text-sm">
              {item.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
              )}
              <span className={cn(item.ok ? 'text-muted-foreground' : 'text-foreground')}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="rounded-lg bg-muted px-2.5 py-1 tabular-nums">
            Carga {cargaSesion != null ? cargaSesion : '—'}
          </span>
          <span className="rounded-lg bg-muted px-2.5 py-1">
            Intensidad {intensidadCalculada || '—'}
          </span>
          <span className="rounded-lg bg-muted px-2.5 py-1">
            Estado {estado}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold">RPE / carga por tarea</h3>
        <p className="text-xs text-muted-foreground">
          Resumen automático desde la densidad y duración de cada tarea (lectura).
        </p>
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
        {checklist.isCompletada || estado === 'completada' ? (
          <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 px-4 py-2.5 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Sesión completada (por fecha)
          </div>
        ) : checklist.isPlanificada || estado === 'planificada' ? (
          <div className="inline-flex items-center gap-2 rounded-xl bg-sky-100 text-sky-900 border border-sky-200 px-4 py-2.5 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Planificación cerrada
          </div>
        ) : (
          <Button
            size="lg"
            onClick={handleCerrar}
            disabled={closing || !ready}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {closing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Flag className="h-4 w-4 mr-2" />}
            Cerrar planificación
          </Button>
        )}
        {!ready && estado === 'borrador' && (
          <p className="text-xs text-muted-foreground">
            Falta objetivo, tareas o convocatoria con presentes.
          </p>
        )}
        <p className="text-[11px] text-muted-foreground sm:ml-auto tabular-nums">
          Sesión {sesionId.slice(0, 8)}…
        </p>
      </div>
    </div>
  )
}
