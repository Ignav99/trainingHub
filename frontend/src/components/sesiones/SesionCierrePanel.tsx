'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  CheckCircle2,
  Circle,
  Activity,
  FileText,
  Loader2,
  Download,
  Eye,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { EstadoSesion } from '@/types'

type Checklist = {
  hasObjetivo: boolean
  hasTareas: boolean
  asistenciaSaved: boolean
  presentes: number
  hasNotasPost: boolean
  isCompletada: boolean
}

export function SesionCierrePanel({
  sesionId,
  estado,
  notasPost,
  checklist,
  onNotasPostChange,
  onCompletar,
  onPreviewPdf,
  onDownloadPdf,
  previewingPdf,
  generatingPdf,
}: {
  sesionId: string
  estado: EstadoSesion
  notasPost: string
  checklist: Checklist
  onNotasPostChange: (value: string) => void
  onCompletar: () => Promise<void>
  onPreviewPdf: () => void
  onDownloadPdf: () => void
  previewingPdf?: boolean
  generatingPdf?: boolean
}) {
  const [completing, setCompleting] = useState(false)

  const items = [
    { ok: checklist.hasObjetivo, label: 'Objetivo de la sesión definido' },
    { ok: checklist.hasTareas, label: 'Al menos una tarea en el diseño' },
    {
      ok: checklist.asistenciaSaved && checklist.presentes > 0,
      label: checklist.presentes > 0
        ? `Convocatoria con ${checklist.presentes} presentes`
        : 'Convocatoria guardada con presentes',
    },
    { ok: checklist.hasNotasPost, label: 'Notas post-sesión (opcional)', optional: true },
  ]

  const ready =
    checklist.hasObjetivo &&
    checklist.hasTareas &&
    checklist.asistenciaSaved &&
    checklist.presentes > 0

  const handleCompletar = async () => {
    if (checklist.isCompletada) return
    if (!ready) {
      toast.error('Completa objetivo, tareas y convocatoria antes de cerrar')
      return
    }
    setCompleting(true)
    try {
      await onCompletar()
      toast.success('Sesión marcada como completada')
    } catch {
      toast.error('No se pudo completar la sesión')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-2xl border bg-gradient-to-br from-emerald-50/80 via-card to-sky-50/40 p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight">Cierre de sesión</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Confirma asistencia, registra RPE de los presentes y cierra el ciclo de carga.
          Todos los perfiles pueden editar cualquier paso.
        </p>

        <ul className="mt-5 space-y-2.5">
          {items.map((item) => (
            <li key={item.label} className="flex items-start gap-2.5 text-sm">
              {item.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <Circle className={cn('h-4 w-4 mt-0.5 shrink-0', item.optional ? 'text-muted-foreground/40' : 'text-amber-500')} />
              )}
              <span className={cn(!item.ok && !item.optional && 'text-foreground', item.ok && 'text-muted-foreground')}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <label className="text-sm font-medium block">Notas post-sesión</label>
        <Textarea
          value={notasPost}
          onChange={(e) => onNotasPostChange(e.target.value)}
          placeholder="Qué salió bien, qué ajustar para el próximo microciclo…"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href={`/rpe`}
          className="flex items-center gap-3 rounded-2xl border bg-sky-50/80 border-sky-200 p-4 hover:bg-sky-100/80 transition-colors"
        >
          <div className="h-10 w-10 rounded-xl bg-sky-100 flex items-center justify-center">
            <Activity className="h-5 w-5 text-sky-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Registrar RPE / Wellness</p>
            <p className="text-xs text-muted-foreground">Abre el módulo de salud para los presentes</p>
          </div>
          <ArrowRight className="h-4 w-4 text-sky-700 shrink-0" />
        </Link>

        <div className="flex items-center gap-2 rounded-2xl border bg-card p-4">
          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Exportar</p>
            <p className="text-xs text-muted-foreground">PDF de la sesión</p>
          </div>
          <Button variant="outline" size="icon" onClick={onPreviewPdf} disabled={previewingPdf} title="Vista previa">
            {previewingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={onDownloadPdf} disabled={generatingPdf} title="Descargar">
            {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
        {checklist.isCompletada || estado === 'completada' ? (
          <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 px-4 py-2.5 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Sesión completada
          </div>
        ) : (
          <Button
            size="lg"
            onClick={handleCompletar}
            disabled={completing || !ready}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {completing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlagIcon />}
            Marcar como completada
          </Button>
        )}
        {!ready && estado !== 'completada' && (
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

function FlagIcon() {
  return (
    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  )
}
