'use client'

import { useState, useRef, lazy, Suspense } from 'react'
import useSWR from 'swr'
import { useEquipoStore } from '@/stores/equipoStore'
import { useClubStore } from '@/stores/clubStore'
import { partidosApi } from '@/lib/api/partidos'
import { videoAnotacionesApi } from '@/lib/api/videoAnotaciones'
import { videosApi } from '@/lib/api/videos'
import type { Partido, VideoAnotacion } from '@/types'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TeamCrest } from '@/components/ui/team-crest'
import { toast } from 'sonner'
import {
  ScanSearch,
  Upload,
  Clock,
  Trash2,
  Film,
  Clapperboard,
} from 'lucide-react'
import { formatTime } from '@/components/video-analyzer/utils'
import { readLocalVideoFingerprint } from '@/components/video-analyzer/extractClip'
import { groupPartidosByMonth, localiaLabel } from '@/components/video-analyzer/videoAnalisisPicker'

const VideoAnalyzer = lazy(() =>
  import('@/components/video-analyzer/VideoAnalyzer').then((m) => ({ default: m.VideoAnalyzer }))
)

export default function VideoAnalisisPage() {
  const equipoActivo = useEquipoStore((s) => s.equipoActivo)
  const equipoId = equipoActivo?.id || ''
  const clubName = useClubStore((s) => s.organizacion?.nombre || equipoActivo?.nombre || 'Nosotros')
  const clubCrest = useClubStore((s) => s.theme.logoUrl || s.organizacion?.logo_url)

  const [source, setSource] = useState<{ kind: 'loose' } | { kind: 'match'; id: string } | null>(null)
  const [analyzerFile, setAnalyzerFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: partidosData } = useSWR(
    equipoId ? `/partidos?equipo_id=${equipoId}&limit=80&orden=fecha&direccion=desc` : null,
    () => partidosApi.list({ equipo_id: equipoId, limit: 80, orden: 'fecha', direccion: 'desc' })
  )
  const partidos = partidosData?.data || []
  const selectedPartido = source?.kind === 'match' ? partidos.find((p) => p.id === source.id) || null : null
  const months = groupPartidosByMonth(partidos)

  const { data: anotacionesData, mutate: mutateAnotaciones } = useSWR(
    selectedPartido && equipoId ? `/video-anotaciones/partido/${selectedPartido.id}` : null,
    () => videoAnotacionesApi.list(selectedPartido!.id, equipoId)
  )
  const anotaciones = anotacionesData?.data || []

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [localVideoId, setLocalVideoId] = useState<string | null>(null)

  const handleFileSelect = () => {
    if (!source) {
      toast.error('Elige un partido o un vídeo suelto')
      return
    }
    fileRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('video/')) {
      toast.error('Solo se permiten archivos de video')
      return
    }

    try {
      const { fingerprint, durationMs } = await readLocalVideoFingerprint(f)
      const session = await videosApi.createLocalSession({
        partido_id: selectedPartido?.id,
        equipo_id: equipoId,
        filename: f.name,
        size_bytes: f.size,
        duration_ms: durationMs,
        fingerprint,
      })
      setLocalVideoId(session.id)
    } catch {
      setLocalVideoId(null)
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
        description="Elige un partido por fecha o un vídeo suelto. El archivo se queda en el ordenador; solo recortas lo que importa"
      />

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="space-y-6">
        <Card className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {source?.kind === 'loose'
                ? 'Vídeo suelto — entrenamiento, charla o lo que sea, sin asociar a un partido'
                : selectedPartido
                  ? `${selectedPartido.rival?.nombre_corto || selectedPartido.rival?.nombre || 'Partido'} · ${localiaLabel(selectedPartido.localia)}`
                  : 'Elige un partido (escudos, casa/fuera) o un vídeo que no va a ningún partido'}
            </p>
            <Button onClick={handleFileSelect} disabled={!source}>
              <Upload className="h-4 w-4 mr-2" />
              Cargar video local
            </Button>
          </div>
        </Card>

        <button
          type="button"
          onClick={() => setSource({ kind: 'loose' })}
          className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
            source?.kind === 'loose' ? 'border-foreground bg-muted' : 'hover:bg-muted/60'
          }`}
        >
          <span className="grid h-12 w-12 place-items-center rounded-md border bg-background">
            <Clapperboard className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-medium">Vídeo suelto</span>
            <span className="block text-sm text-muted-foreground">
              Entrenamiento, ejercicio o cualquier vídeo. No se asocia a un partido.
            </span>
          </span>
        </button>

        {months.map((month) => (
          <section key={month.key} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {month.label}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {month.partidos.map((p) => (
                <MatchPickCard
                  key={p.id}
                  partido={p}
                  clubName={clubName}
                  clubCrest={clubCrest}
                  selected={source?.kind === 'match' && source.id === p.id}
                  onSelect={() => setSource({ kind: 'match', id: p.id })}
                />
              ))}
            </div>
          </section>
        ))}

        {partidos.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No hay partidos en este equipo. Puedes cargar un vídeo suelto igual.
          </Card>
        ) : null}

        {selectedPartido ? (
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
                <p>Pulsa un botón en el momento. El recorte entra en esa línea.</p>
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
        ) : null}
      </div>

      {analyzerFile && source ? (
        <Suspense fallback={null}>
          <VideoAnalyzer
            localFile={analyzerFile}
            partidoId={selectedPartido?.id}
            equipoId={equipoId}
            videoId={localVideoId || undefined}
            rivalId={selectedPartido?.rival_id}
            onClose={() => {
              setAnalyzerFile(null)
              setLocalVideoId(null)
              mutateAnotaciones()
            }}
          />
        </Suspense>
      ) : null}
    </>
  )
}

function MatchPickCard({
  partido,
  clubName,
  clubCrest,
  selected,
  onSelect,
}: {
  partido: Partido
  clubName: string
  clubCrest?: string | null
  selected: boolean
  onSelect: () => void
}) {
  const fecha = new Date(partido.fecha)
  const dateLabel = Number.isNaN(fecha.getTime())
    ? 'Sin fecha'
    : fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
  const rivalName = partido.rival?.nombre_corto || partido.rival?.nombre || 'Rival'
  const home = partido.localia === 'local'
  const leftName = home ? clubName : rivalName
  const rightName = home ? rivalName : clubName
  const leftCrest = home ? clubCrest : partido.rival?.escudo_url
  const rightCrest = home ? partido.rival?.escudo_url : clubCrest

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
        selected ? 'border-foreground bg-muted' : 'hover:bg-muted/60'
      }`}
    >
      <div className="min-w-[4.5rem] tabular-nums">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{dateLabel}</p>
        {partido.jornada ? <p className="text-[11px] text-muted-foreground">J{partido.jornada}</p> : null}
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
        <TeamCrest src={leftCrest} name={leftName} size="md" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {home ? 'vs' : '@'}
        </span>
        <TeamCrest src={rightCrest} name={rightName} size="md" />
      </div>
      <span className="shrink-0 rounded border px-2 py-0.5 text-[10px] uppercase tracking-wide">
        {localiaLabel(partido.localia)}
      </span>
    </button>
  )
}

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
