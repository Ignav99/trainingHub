'use client'

import { useState, useRef, lazy, Suspense } from 'react'
import useSWR from 'swr'
import { useEquipoStore } from '@/stores/equipoStore'
import { partidosApi } from '@/lib/api/partidos'
import { videoAnotacionesApi } from '@/lib/api/videoAnotaciones'
import type { Partido, VideoAnotacion } from '@/types'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  ScanSearch,
  Upload,
  Clock,
  Trash2,
  Film,
  ChevronDown,
} from 'lucide-react'
import { formatTime } from '@/components/video-analyzer/utils'

const VideoAnalyzer = lazy(() =>
  import('@/components/video-analyzer/VideoAnalyzer').then((m) => ({ default: m.VideoAnalyzer }))
)

export default function VideoAnalisisPage() {
  const equipoActivo = useEquipoStore((s) => s.equipoActivo)
  const equipoId = equipoActivo?.id || ''

  // Partido selector
  const [selectedPartidoId, setSelectedPartidoId] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Analyzer state
  const [analyzerFile, setAnalyzerFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Fetch partidos for selector
  const { data: partidosData } = useSWR(
    equipoId ? `/partidos?equipo_id=${equipoId}&limit=50&orden=fecha&direccion=desc` : null,
    () => partidosApi.list({ equipo_id: equipoId, limit: 50, orden: 'fecha', direccion: 'desc' })
  )
  const partidos = partidosData?.data || []
  const selectedPartido = partidos.find((p) => p.id === selectedPartidoId) || null

  // Fetch anotaciones for selected partido
  const { data: anotacionesData, mutate: mutateAnotaciones } = useSWR(
    selectedPartidoId && equipoId ? `/video-anotaciones/partido/${selectedPartidoId}` : null,
    () => videoAnotacionesApi.list(selectedPartidoId!, equipoId)
  )
  const anotaciones = anotacionesData?.data || []

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleFileSelect = () => {
    if (!selectedPartidoId) {
      toast.error('Selecciona un partido primero')
      return
    }
    fileRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('video/')) {
      toast.error('Solo se permiten archivos de video')
      return
    }
    setAnalyzerFile(f)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDeleteAnotacion = async (id: string) => {
    if (!confirm('¿Eliminar este momento?')) return
    setDeletingId(id)
    try {
      await videoAnotacionesApi.delete(id, equipoId)
      mutateAnotaciones()
      toast.success('Momento eliminado')
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  const formatPartidoLabel = (p: Partido) => {
    const fecha = new Date(p.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
    const jornada = p.jornada ? `J${p.jornada}` : ''
    return `${fecha} ${jornada} · ${p.localia === 'local' ? 'vs' : '@'} ${p.rival_id ? 'Rival' : '—'}`.trim()
  }

  if (!equipoActivo) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Selecciona un equipo para acceder al análisis de video
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Video Análisis"
        description="Carga un video de partido, dibuja anotaciones y guarda momentos clave"
      />

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="space-y-6">
        {/* Controls row */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Partido selector */}
            <div className="relative flex-1 min-w-0 w-full sm:w-auto">
              <button
                className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span className="truncate">
                  {selectedPartido
                    ? formatPartidoLabel(selectedPartido)
                    : 'Seleccionar partido...'}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {partidos.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        No hay partidos
                      </div>
                    ) : (
                      partidos.map((p) => (
                        <button
                          key={p.id}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                            selectedPartidoId === p.id ? 'bg-muted font-medium' : ''
                          }`}
                          onClick={() => {
                            setSelectedPartidoId(p.id)
                            setDropdownOpen(false)
                          }}
                        >
                          {formatPartidoLabel(p)}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Load video button */}
            <Button onClick={handleFileSelect} disabled={!selectedPartidoId}>
              <Upload className="h-4 w-4 mr-2" />
              Cargar video local
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            El video se carga desde tu ordenador y no se sube al servidor. Solo los momentos guardados y clips recortados se almacenan.
          </p>
        </Card>

        {/* Saved anotaciones for selected partido */}
        {selectedPartidoId && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Film className="h-4 w-4" />
              Momentos guardados
              {anotaciones.length > 0 && (
                <span className="text-muted-foreground font-normal">({anotaciones.length})</span>
              )}
            </h3>

            {anotaciones.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground text-sm">
                <ScanSearch className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No hay momentos guardados para este partido</p>
                <p className="text-xs mt-1">Carga un video y usa el analizador para crear anotaciones</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {anotaciones.map((a) => (
                  <AnotacionCard
                    key={a.id}
                    anotacion={a}
                    onDelete={() => handleDeleteAnotacion(a.id)}
                    deleting={deletingId === a.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state when no partido selected */}
        {!selectedPartidoId && (
          <Card className="p-12 text-center text-muted-foreground">
            <ScanSearch className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium">Selecciona un partido</p>
            <p className="text-sm mt-1">Elige un partido del desplegable y carga un video para empezar a analizar</p>
          </Card>
        )}
      </div>

      {/* Full-screen analyzer */}
      {analyzerFile && selectedPartidoId && (
        <Suspense fallback={null}>
          <VideoAnalyzer
            localFile={analyzerFile}
            partidoId={selectedPartidoId}
            equipoId={equipoId}
            onClose={() => {
              setAnalyzerFile(null)
              mutateAnotaciones()
            }}
          />
        </Suspense>
      )}
    </>
  )
}

// ============ Anotacion Card ============

function AnotacionCard({
  anotacion,
  onDelete,
  deleting,
}: {
  anotacion: VideoAnotacion
  onDelete: () => void
  deleting: boolean
}) {
  return (
    <Card className="p-3 space-y-2">
      {anotacion.thumbnail_data ? (
        <img
          src={anotacion.thumbnail_data}
          alt={anotacion.titulo}
          className="w-full aspect-video rounded-md object-cover bg-muted"
        />
      ) : (
        <div className="w-full aspect-video rounded-md bg-muted flex items-center justify-center text-muted-foreground">
          <Clock className="h-6 w-6 opacity-30" />
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{anotacion.titulo}</p>
          <p className="text-xs text-muted-foreground">
            {formatTime(anotacion.timestamp_seconds)}
          </p>
          {anotacion.descripcion && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{anotacion.descripcion}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive shrink-0"
          onClick={onDelete}
          disabled={deleting}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  )
}
