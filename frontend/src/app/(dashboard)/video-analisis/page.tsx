'use client'

import { useEffect, useMemo, useState, useRef, lazy, Suspense } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TeamCrest } from '@/components/ui/team-crest'
import { toast } from 'sonner'
import {
  ScanSearch,
  Upload,
  Clock,
  Trash2,
  Film,
  Clapperboard,
  PenLine,
} from 'lucide-react'
import { formatTime } from '@/components/video-analyzer/utils'
import { readLocalVideoFingerprint } from '@/components/video-analyzer/extractClip'
import {
  canLoadMatchVideo,
  groupPartidosByMonth,
  localiaLabel,
  matchArchiveLabel,
  revisionLinkForMode,
  watchedMatchNote,
  type VideoWatchMode,
} from '@/components/video-analyzer/videoAnalisisPicker'
import { revisionApi } from '@/lib/api/revision'
import { revisionDestinoLabel } from '@/lib/revisionDestino'

const VideoAnalyzer = lazy(() =>
  import('@/components/video-analyzer/VideoAnalyzer').then((m) => ({ default: m.VideoAnalyzer }))
)
const PresentacionSala = lazy(() =>
  import('@/components/revision/PresentacionSala').then((m) => ({ default: m.PresentacionSala }))
)

export default function VideoAnalisisPage() {
  const equipoActivo = useEquipoStore((s) => s.equipoActivo)
  const equipoId = equipoActivo?.id || ''
  const clubName = useClubStore((s) => s.organizacion?.nombre || equipoActivo?.nombre || 'Nosotros')
  const clubCrest = useClubStore((s) => s.theme.logoUrl || s.organizacion?.logo_url)

  const [source, setSource] = useState<{ kind: 'loose' } | { kind: 'match'; id: string } | null>(null)
  const [watchMode, setWatchMode] = useState<VideoWatchMode | null>(null)
  const [watchedOpponent, setWatchedOpponent] = useState('')
  const [analyzerFile, setAnalyzerFile] = useState<File | null>(null)
  const [directo, setDirecto] = useState<{ code: string; pass: string; share: boolean; clips: { src: string; title: string }[] } | null>(null)
  const [directoMenu, setDirectoMenu] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const directoRef = useRef<HTMLInputElement>(null)
  const directoClipsRef = useRef<{ src: string; title: string }[]>([])
  const directoRoomRef = useRef<{ code: string; pass: string } | null>(null)
  const directoShareRef = useRef(false)

  useEffect(() => () => {
    for (const clip of directoClipsRef.current) URL.revokeObjectURL(clip.src)
  }, [])

  const { data: partidosData } = useSWR(
    equipoId ? `/partidos?equipo_id=${equipoId}&limit=80&orden=fecha&direccion=desc` : null,
    () => partidosApi.list({ equipo_id: equipoId, limit: 80, orden: 'fecha', direccion: 'desc' })
  )
  const partidos = partidosData?.data || []
  const destinos = useMemo(
    () => (partidosData?.data ?? []).map((partido) => ({
      id: partido.id,
      rivalId: partido.rival_id,
      label: revisionDestinoLabel({
        fecha: partido.fecha,
        rivalName: partido.rival?.nombre_corto || partido.rival?.nombre || 'Rival',
        localia: partido.localia,
      }),
    })),
    [partidosData?.data],
  )
  const selectedPartido = source?.kind === 'match' ? partidos.find((p) => p.id === source.id) || null : null
  const months = groupPartidosByMonth(partidos)
  const rivalName = selectedPartido?.rival?.nombre_corto || selectedPartido?.rival?.nombre || 'el rival'
  const link = watchMode ? revisionLinkForMode(watchMode) : null
  const opponentNote = watchMode === 'informe_rival' ? watchedMatchNote(watchedOpponent) : undefined
  const canLoad = source?.kind === 'loose' || (source?.kind === 'match' && canLoadMatchVideo(watchMode, watchedOpponent))

  const { data: anotacionesData, mutate: mutateAnotaciones } = useSWR(
    selectedPartido && equipoId ? `/video-anotaciones/partido/${selectedPartido.id}` : null,
    () => videoAnotacionesApi.list(selectedPartido!.id, equipoId)
  )
  const anotaciones = anotacionesData?.data || []

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [localVideoId, setLocalVideoId] = useState<string | null>(null)

  const closeDirecto = () => {
    setDirecto((current) => {
      for (const clip of current?.clips ?? []) URL.revokeObjectURL(clip.src)
      directoClipsRef.current = []
      directoRoomRef.current = null
      return null
    })
  }

  const handleDirectoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (picked.length === 0) return
    const videos = picked.filter((file) => file.type.startsWith('video/'))
    if (videos.length === 0) {
      toast.error('Solo se permiten archivos de video')
      return
    }
    if (videos.length < picked.length) toast('Se han dejado fuera los archivos que no son vídeo')
    const added = videos.map((file) => ({ src: URL.createObjectURL(file), title: file.name }))
    const share = directoShareRef.current
    if (share && !directoRoomRef.current?.pass) {
      try {
        directoRoomRef.current = await revisionApi.openVideoRoom()
      } catch {
        toast.error('No se ha podido abrir la sala de la tablet. El vídeo sigue en este ordenador.')
        directoShareRef.current = false
      }
    }
    const room = directoShareRef.current ? (directoRoomRef.current || { code: '', pass: '' }) : { code: '', pass: '' }
    setDirecto((current) => {
      const clips = [...(current?.clips ?? []), ...added]
      directoClipsRef.current = clips
      return { code: room.code, pass: room.pass, share: directoShareRef.current, clips }
    })
  }

  const startDirecto = (share: boolean) => {
    directoShareRef.current = share
    setDirectoMenu(false)
    directoRef.current?.click()
  }

  const handleFileSelect = () => {
    if (!source) {
      toast.error('Elige un partido o un vídeo suelto')
      return
    }
    if (source.kind === 'match' && !canLoadMatchVideo(watchMode, watchedOpponent)) {
      toast.error(watchMode === 'informe_rival'
        ? 'Escribe contra quién juega el rival en este vídeo'
        : 'Elige revisión del partido o informe del rival')
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
        partido_id: link?.attachUpcomingMatch ? selectedPartido?.id : undefined,
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
        description="Elige el partido que vais a jugar y si el vídeo es el vuestro o del rival contra otro equipo"
      />

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={directoRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={handleDirectoChange}
      />

      <div className="space-y-6">
        <Card className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {source?.kind === 'loose'
                ? 'Vídeo suelto — entrenamiento, charla o lo que sea, sin asociar a un partido'
                : selectedPartido && watchMode === 'informe_rival'
                  ? `Informe de ${rivalName}${opponentNote ? ` · ${opponentNote}` : ''}. Al enviar un recorte eliges el partido y si va a su informe, al plan o al informe de partido.`
                  : selectedPartido && watchMode === 'revision'
                    ? `Revisión del partido · ${rivalName} · ${localiaLabel(selectedPartido.localia)}`
                    : selectedPartido
                      ? `${rivalName} · ${localiaLabel(selectedPartido.localia)}. Elige revisión del partido o informe del rival.`
                      : 'Elige el partido que vais a jugar, o un vídeo que no va a ningún partido'}
            </p>
            <Button onClick={handleFileSelect} disabled={!canLoad}>
              <Upload className="h-4 w-4 mr-2" />
              Cargar video local
            </Button>
          </div>
          {selectedPartido ? (
            <div className="mt-4 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setWatchMode('revision')}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    watchMode === 'revision' ? 'border-foreground bg-muted' : 'hover:bg-muted/60'
                  }`}
                >
                  <span className="block text-sm font-medium">Revisión del partido</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    El vídeo es este partido, el vuestro contra {rivalName}.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setWatchMode('informe_rival')}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    watchMode === 'informe_rival' ? 'border-foreground bg-muted' : 'hover:bg-muted/60'
                  }`}
                >
                  <span className="block text-sm font-medium">Informe del rival</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    El vídeo es de {rivalName} contra otro equipo. Los recortes pueden ir a cualquier partido.
                  </span>
                </button>
              </div>
              {watchMode === 'informe_rival' ? (
                <div className="space-y-1 max-w-sm">
                  <Label htmlFor="watched-opponent">Contra quién juega {rivalName} en este vídeo</Label>
                  <Input
                    id="watched-opponent"
                    value={watchedOpponent}
                    onChange={(e) => setWatchedOpponent(e.target.value)}
                    placeholder="Ej. Herrera"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>

        <div className="rounded-lg border">
          <button
            type="button"
            onClick={() => setDirectoMenu((open) => !open)}
            aria-expanded={directoMenu}
            className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/60"
          >
            <span className="grid h-12 w-12 place-items-center rounded-md border bg-background">
              <PenLine className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-medium">Anotador de vídeo en directo</span>
              <span className="block text-sm text-muted-foreground">
                Importa varios vídeos y pásalos en la lista de la derecha. Puedes verlos solo aquí o abrir la misma imagen en una tablet. Los archivos se quedan en este ordenador.
              </span>
            </span>
          </button>
          {directoMenu && (
            <div className="grid gap-2 border-t p-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => startDirecto(false)}
                className="rounded-lg border p-3 text-left transition-colors hover:bg-muted/60"
              >
                <span className="block text-sm font-medium">Solo en este ordenador</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  La lista queda a la derecha. No se crea sala ni QR.
                </span>
              </button>
              <button
                type="button"
                onClick={() => startDirecto(true)}
                className="rounded-lg border p-3 text-left transition-colors hover:bg-muted/60"
              >
                <span className="block text-sm font-medium">Con tablet</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Sale un QR. La tablet ve el vídeo y la misma lista. Misma WiFi.
                </span>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setSource({ kind: 'loose' })
            setWatchMode(null)
            setWatchedOpponent('')
          }}
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
                  onSelect={() => {
                    setSource({ kind: 'match', id: p.id })
                    setWatchMode(null)
                    setWatchedOpponent('')
                  }}
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

      {directo ? (
        <Suspense fallback={null}>
          <PresentacionSala
            role="host"
            code={directo.code}
            guestPass={directo.share ? directo.pass : null}
            shareDevice={directo.share}
            directoRoom
            localPlaylist={directo.clips}
            onAddLocalVideos={() => directoRef.current?.click()}
            onClose={closeDirecto}
          />
        </Suspense>
      ) : null}

      {analyzerFile && source ? (
        <Suspense fallback={null}>
          <VideoAnalyzer
            localFile={analyzerFile}
            videoTitle={matchArchiveLabel({
              clubName,
              rivalName: selectedPartido ? rivalName : null,
              localia: selectedPartido?.localia,
              fecha: selectedPartido?.fecha,
              watchMode,
              watchedOpponent: opponentNote,
              fileName: analyzerFile.name,
            })}
            partidoId={link?.attachUpcomingMatch ? selectedPartido?.id : undefined}
            equipoId={equipoId}
            videoId={localVideoId || undefined}
            rivalId={selectedPartido?.rival_id}
            destinos={destinos}
            defaultDestinoId={selectedPartido?.id}
            watchMode={watchMode || undefined}
            watchedOpponent={opponentNote}
            rivalName={selectedPartido ? rivalName : undefined}
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
