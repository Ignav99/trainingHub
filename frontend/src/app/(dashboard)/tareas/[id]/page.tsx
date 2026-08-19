'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import {
  ArrowLeft,
  Edit,
  Copy,
  Trash2,
  Loader2,
  Download,
  Sparkles,
  Pencil,
  GitBranch,
  Check,
  X,
} from 'lucide-react'
import { DetailPageSkeleton } from '@/components/ui/page-skeletons'
import { Button } from '@/components/ui'
import { tareasApi } from '@/lib/api/tareas'
import { apiKey } from '@/lib/swr'
import { Tarea } from '@/types'
import TareaPizarraEditor from '@/components/tactical-board/TareaPizarraEditor'
import { TareaFamiliaPanel } from '@/components/tareas/TareaFamiliaPanel'
import TareaFichaView from '@/components/tareas/TareaFichaView'
import { nombreTipoVariante } from '@/lib/catalogos/canonico'
import { emptyTareaPizarra, type TareaPizarraData } from '@/components/tactical-board/types'
import { cn } from '@/lib/utils'

export default function TareaDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const tareaId = params.id as string

  const [detailTab, setDetailTab] = useState<'resumen' | 'variantes'>(
    searchParams.get('tab') === 'variantes' ? 'variantes' : 'resumen'
  )
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [generatingDiagram, setGeneratingDiagram] = useState(false)
  const [savingDiagram, setSavingDiagram] = useState(false)
  const [boardEditing, setBoardEditing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    const t = searchParams.get('tab')
    setDetailTab(t === 'variantes' ? 'variantes' : 'resumen')
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get('pizarra') === '1' || searchParams.get('editar') === 'pizarra') {
      setBoardEditing(true)
    }
  }, [searchParams])

  const goTab = (tab: 'resumen' | 'variantes') => {
    setDetailTab(tab)
    const url = tab === 'variantes' ? `/tareas/${tareaId}?tab=variantes` : `/tareas/${tareaId}`
    router.replace(url, { scroll: false })
  }

  const handleGenerateDiagram = useCallback(async () => {
    if (!tareaId) return
    setGeneratingDiagram(true)
    try {
      await tareasApi.generateDiagram(tareaId)
      await mutate(apiKey(`/tareas/${tareaId}`))
      setBoardEditing(true)
    } catch (e: any) {
      setActionError(e.message || 'Error al generar diagrama')
    } finally {
      setGeneratingDiagram(false)
    }
  }, [tareaId])

  const diagramSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const handleDiagramChange = useCallback((data: TareaPizarraData) => {
    if (!tareaId) return
    if (diagramSaveTimer.current) clearTimeout(diagramSaveTimer.current)
    diagramSaveTimer.current = setTimeout(async () => {
      setSavingDiagram(true)
      try {
        await tareasApi.update(tareaId, { grafico_data: data })
        await mutate(apiKey(`/tareas/${tareaId}`))
      } catch (e: any) {
        setActionError(e.message || 'Error al guardar diagrama')
      } finally {
        setSavingDiagram(false)
      }
    }, 2000)
  }, [tareaId])

  const { data: tarea, error: swrError, isLoading } = useSWR<Tarea>(
    tareaId ? apiKey(`/tareas/${tareaId}`) : null
  )

  const error = actionError || (swrError ? (swrError.message || 'Error al cargar la tarea') : null)

  const invalidateTareas = () => {
    mutate((key: string) => typeof key === 'string' && key.includes('/tareas'), undefined, { revalidate: true })
  }

  const handleDuplicate = async () => {
    if (!tarea) return
    try {
      const duplicated = await tareasApi.duplicate(tareaId)
      invalidateTareas()
      router.push(`/tareas/${duplicated.id}`)
    } catch (err: any) {
      setActionError(err.message || 'Error al duplicar la tarea')
    }
  }

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true)
    try {
      const blob = await tareasApi.generatePdf(tareaId)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch (err: any) {
      setActionError(err.message || 'Error al generar PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleDelete = async () => {
    if (!tarea) return
    setDeleting(true)
    try {
      await tareasApi.delete(tareaId)
      invalidateTareas()
      router.push('/tareas')
    } catch (err: any) {
      setActionError(err.message || 'Error al eliminar la tarea')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (isLoading) {
    return <DetailPageSkeleton />
  }

  if (error || !tarea) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/tareas" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Error</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error || 'Tarea no encontrada'}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link href="/tareas" className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {tarea.categoria && (
                <span
                  className="px-2 py-1 text-xs font-medium rounded"
                  style={{ backgroundColor: tarea.categoria.color + '20', color: tarea.categoria.color }}
                >
                  {tarea.categoria.nombre}
                </span>
              )}
              {tarea.es_plantilla && (
                <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                  Plantilla
                </span>
              )}
              {tarea.tarea_origen_id ? (
                <span className="px-2 py-1 text-xs font-medium bg-violet-100 text-violet-700 rounded">
                  {nombreTipoVariante(tarea.tipo_variante)}
                </span>
              ) : (tarea.num_variantes ?? 0) > 0 ? (
                <span className="px-2 py-1 text-xs font-medium bg-sky-100 text-sky-800 rounded">
                  Madre · {tarea.num_variantes} variantes
                </span>
              ) : (
                <span className="px-2 py-1 text-xs font-medium bg-sky-50 text-sky-700 rounded">
                  Tarea madre
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1 truncate">{tarea.titulo}</h1>
            {tarea.codigo && (
              <p className="text-sm text-gray-500">Código: {tarea.codigo}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
          <button
            type="button"
            onClick={() => goTab('variantes')}
            className="inline-flex items-center gap-2 px-4 py-2 border border-sky-200 bg-sky-50 text-sky-800 rounded-lg hover:bg-sky-100"
          >
            <GitBranch className="h-4 w-4" />
            {(tarea.num_variantes ?? 0) > 0
              ? `Variantes (${tarea.num_variantes})`
              : 'Variantes'}
          </button>
          <button
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50"
          >
            {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            PDF
          </button>
          <button
            onClick={handleDuplicate}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            <Copy className="h-4 w-4" />
            Duplicar
          </button>
          <Link
            href={`/tareas/${tareaId}/editar`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Edit className="h-4 w-4" />
            Editar
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="inline-flex bg-muted rounded-lg p-0.5 mb-6">
        <button
          type="button"
          onClick={() => goTab('resumen')}
          className={cn(
            'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
            detailTab === 'resumen'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Resumen
        </button>
        <button
          type="button"
          onClick={() => goTab('variantes')}
          className={cn(
            'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all',
            detailTab === 'variantes'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <GitBranch className="h-3.5 w-3.5" />
          Variantes
          {(tarea.num_variantes ?? 0) > 0 && (
            <span className="rounded-full bg-sky-100 text-sky-800 text-[10px] font-semibold px-1.5 py-0.5">
              {tarea.num_variantes}
            </span>
          )}
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Eliminar tarea</h3>
            <p className="text-gray-600 mb-4">
              ¿Seguro que quieres eliminar &quot;{tarea.titulo}&quot;? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {detailTab === 'variantes' ? (
        <TareaFamiliaPanel tarea={tarea} />
      ) : (
        <div className="space-y-6 pb-16">
          <div className="flex items-center justify-end gap-2">
            {savingDiagram && <span className="text-xs text-gray-400">Guardando pizarra…</span>}
            <button
              type="button"
              onClick={handleGenerateDiagram}
              disabled={generatingDiagram}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-muted-foreground disabled:opacity-50"
              title="Genera un boceto inicial con IA; puedes retocarlo en la pizarra"
            >
              {generatingDiagram ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Boceto IA
            </button>
            <button
              type="button"
              onClick={() => setBoardEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border bg-primary text-primary-foreground border-primary hover:bg-primary/90"
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar pizarra
            </button>
          </div>

          <TareaFichaView
            tarea={tarea}
            variant="all"
            onOpenBoard={() => setBoardEditing(true)}
          />

          <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-1">
            <span>Usos: <strong className="text-foreground">{tarea.num_usos}</strong></span>
            {tarea.valoracion_media ? (
              <span>Valoración: <strong className="text-foreground">{tarea.valoracion_media.toFixed(1)}/5</strong></span>
            ) : null}
            <span>Creada: <strong className="text-foreground">{new Date(tarea.created_at).toLocaleDateString('es-ES')}</strong></span>
            <span>Actualizada: <strong className="text-foreground">{new Date(tarea.updated_at).toLocaleDateString('es-ES')}</strong></span>
          </div>
        </div>
      )}

      {boardEditing && (
        <div className="fixed inset-0 z-[60] bg-background flex flex-col">
          <div className="flex items-center gap-3 px-4 py-2 border-b flex-shrink-0">
            <button
              type="button"
              onClick={() => setBoardEditing(false)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              aria-label="Cerrar pizarra"
            >
              <X className="h-5 w-5" />
            </button>
            <span className="font-semibold flex-1">Pizarra de la tarea</span>
            {savingDiagram && <span className="text-xs text-muted-foreground">Guardando…</span>}
            <Button size="sm" onClick={() => setBoardEditing(false)}>
              <Check className="h-4 w-4 mr-1.5" />
              Listo
            </Button>
          </div>
          <div className="flex-1 min-h-0">
            <TareaPizarraEditor
              value={(tarea.grafico_data as TareaPizarraData) || emptyTareaPizarra}
              onChange={handleDiagramChange}
              numJugadores={tarea.num_jugadores_min}
              height="100%"
              onClose={() => setBoardEditing(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
