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
  ExternalLink,
  Flag,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { EstadoSesion, SesionTarea } from '@/types'

type PdfVariant = 'reducido' | 'extendido'
type PdfAction = `${PdfVariant}-preview` | `${PdfVariant}-download` | null

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
}: {
  sesionId: string
  estado: EstadoSesion
  checklist?: {
    hasObjetivo?: boolean
    hasTareas?: boolean
    asistenciaSaved?: boolean
    presentes?: number
  }
  tareas?: SesionTarea[]
  cargaSesion?: number | null
  intensidadCalculada?: string | null
  shareToken?: string | null
  shareUrl?: string | null
  onCerrarPlanificacion: () => Promise<void> | void
  onEnableShare: () => Promise<void> | void
  onPreviewPdf: (variant: PdfVariant) => Promise<void> | void
  onDownloadPdf: (variant: PdfVariant) => Promise<void> | void
  /** @deprecated loading se gestiona dentro del panel */
  previewingPdf?: boolean
  generatingPdf?: boolean
}) {
  const [closing, setClosing] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [pdfBusy, setPdfBusy] = useState<PdfAction>(null)

  const isPlanificada = estado === 'planificada'
  const isCompletada = estado === 'completada'

  const runPdf = async (action: Exclude<PdfAction, null>, fn: () => Promise<void> | void) => {
    if (pdfBusy) return
    setPdfBusy(action)
    try {
      await fn()
    } finally {
      setPdfBusy(null)
    }
  }

  const handleShare = async () => {
    setSharing(true)
    try {
      await onEnableShare()
      toast.success('Enlace listo')
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

  const handleCerrar = async () => {
    setClosing(true)
    try {
      await onCerrarPlanificacion()
    } finally {
      setClosing(false)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-lg bg-muted px-2.5 py-1 tabular-nums">
          Carga {cargaSesion != null ? cargaSesion : '—'}
        </span>
        <span className="rounded-lg bg-muted px-2.5 py-1">
          Intensidad {intensidadCalculada || '—'}
        </span>
        <span className="rounded-lg bg-muted px-2.5 py-1 capitalize">{estado}</span>
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
              <p className="text-xs text-muted-foreground">1 folio A4 · vestuario</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!!pdfBusy}
              onClick={() =>
                runPdf('reducido-preview', () => onPreviewPdf('reducido'))
              }
            >
              {pdfBusy === 'reducido-preview' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span className="ml-1.5">Vista</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!!pdfBusy}
              onClick={() =>
                runPdf('reducido-download', () => onDownloadPdf('reducido'))
              }
            >
              {pdfBusy === 'reducido-download' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="ml-1.5">Descargar</span>
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">PDF extendido</p>
              <p className="text-xs text-muted-foreground">Varias páginas · detalle</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!!pdfBusy}
              onClick={() =>
                runPdf('extendido-preview', () => onPreviewPdf('extendido'))
              }
            >
              {pdfBusy === 'extendido-preview' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span className="ml-1.5">Vista</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!!pdfBusy}
              onClick={() =>
                runPdf('extendido-download', () => onDownloadPdf('extendido'))
              }
            >
              {pdfBusy === 'extendido-download' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="ml-1.5">Descargar</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Link2 className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">URL completa (navegable)</p>
            <p className="text-xs text-muted-foreground truncate">
              {shareUrl || (shareToken ? `token ${shareToken.slice(0, 8)}…` : 'Aún no generado')}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleShare} disabled={sharing}>
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generar'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={copyLink}
            disabled={!shareUrl}
            title="Copiar"
          >
            <Copy className="h-4 w-4" />
          </Button>
          {shareUrl && (
            <Button type="button" variant="outline" size="icon" asChild title="Abrir">
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
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
          <Button size="lg" onClick={handleCerrar} disabled={closing}>
            {closing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Flag className="h-4 w-4 mr-2" />}
            Cerrar planificación
          </Button>
        )}
      </div>
    </div>
  )
}
