'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { toast } from 'sonner'
import {
  Clapperboard,
  Download,
  FolderPlus,
  HardDrive,
  MonitorPlay,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Folder,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  revisionApi,
  clipPlaySrc,
  REVISION_FOLDER_PRESETS,
  type RevisionAmbito,
  type RevisionClip,
  type RevisionFolder,
  type RevisionPack,
} from '@/lib/api/revision'
import { SalaHostDialog } from './SalaHostDialog'
import { downloadRevisionPackZip } from '@/lib/revisionPackZip'

const VideoPlayer = dynamic(
  () => import('@/components/video-analyzer/VideoPlayer').then((m) => ({ default: m.VideoPlayer })),
  { ssr: false }
)

interface RevisionLibraryProps {
  equipoId: string
  ambito: RevisionAmbito
  partidoId?: string
  rivalId?: string
  microcicloId?: string
  /** Si se indica, selecciona esa fase al abrir. */
  initialFase?: string
  compact?: boolean
}

export function RevisionLibrary({
  equipoId,
  ambito,
  partidoId,
  rivalId,
  microcicloId,
  initialFase,
  compact,
}: RevisionLibraryProps) {
  const swrKey = equipoId
    ? `revision:${ambito}:${partidoId || ''}:${rivalId || ''}:${microcicloId || ''}`
    : null

  const { data: pack, error, mutate, isLoading } = useSWR(
    swrKey,
    () =>
      revisionApi.getOrCreatePack({
        equipo_id: equipoId,
        ambito,
        partido_id: partidoId,
        rival_id: rivalId,
        microciclo_id: microcicloId,
      }),
    {
      errorRetryCount: 0,
      shouldRetryOnError: false,
      revalidateOnFocus: false,
    }
  )

  const ensurePack = async (): Promise<RevisionPack> => {
    if (pack) return pack
    const next = await revisionApi.getOrCreatePack({
      equipo_id: equipoId,
      ambito,
      partido_id: partidoId,
      rival_id: rivalId,
      microciclo_id: microcicloId,
    })
    await mutate(next, { revalidate: false })
    return next
  }

  const [folderId, setFolderId] = useState<string | null>(null)
  const [playing, setPlaying] = useState<RevisionClip | null>(null)
  const [salaClip, setSalaClip] = useState<RevisionClip | null>(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<RevisionFolder | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [archiveBusy, setArchiveBusy] = useState<'zip' | 'purge' | null>(null)

  const folders = pack?.folders || []
  const rootFolders = folders.filter((f) => !f.parent_id).sort((a, b) => a.orden - b.orden)

  useEffect(() => {
    if (!pack) return
    if (folderId && pack.folders.some((f) => f.id === folderId)) return
    const match = initialFase ? pack.folders.find((f) => f.fase === initialFase) : null
    const firstRoot = [...pack.folders].filter((f) => !f.parent_id).sort((a, b) => a.orden - b.orden)[0]
    setFolderId(match?.id || firstRoot?.id || null)
  }, [pack, initialFase, folderId])

  const selected = folders.find((f) => f.id === folderId) || null
  const children = folders.filter((f) => f.parent_id === folderId).sort((a, b) => a.orden - b.orden)
  const links = pack?.links || []
  const clipsInFolder = useMemo(() => {
    if (!pack || !folderId) return pack?.clips || []
    const ids = new Set(links.filter((l) => l.folder_id === folderId).map((l) => l.clip_id))
    const once = selected?.fase === 'once_probable'
      ? pack.clips.filter((c) => links.some((l) => l.clip_id === c.id && l.slot_tipo === 'once_jugador'))
      : []
    const fromFolder = pack.clips.filter((c) => ids.has(c.id))
    const merged = [...fromFolder]
    for (const c of once) {
      if (!merged.some((x) => x.id === c.id)) merged.push(c)
    }
    return merged
  }, [pack, folderId, links, selected])

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      const current = await ensurePack()
      await revisionApi.createFolder({
        pack_id: current.id,
        nombre: newFolderName.trim(),
        parent_id: newFolderParent || undefined,
      })
      setNewFolderOpen(false)
      setNewFolderName('')
      setNewFolderParent(null)
      mutate()
      toast.success('Carpeta creada')
    } catch {
      toast.error('No se pudo crear la carpeta')
    }
  }

  const handleRename = async () => {
    if (!renaming) return
    try {
      await revisionApi.updateFolder(renaming.id, { nombre: renaming.nombre })
      setRenaming(null)
      mutate()
    } catch {
      toast.error('No se pudo renombrar')
    }
  }

  const handleDeleteFolder = async (folder: RevisionFolder) => {
    if (!confirm(`¿Eliminar la carpeta «${folder.nombre}»? Los clips no se borran.`)) return
    try {
      await revisionApi.deleteFolder(folder.id)
      if (folderId === folder.id) setFolderId(folder.parent_id || rootFolders[0]?.id || null)
      mutate()
    } catch {
      toast.error('No se pudo eliminar')
    }
  }

  const handleDeleteClip = async (clip: RevisionClip) => {
    if (!confirm(`¿Eliminar el recorte «${clip.titulo}»?`)) return
    try {
      await revisionApi.deleteClip(clip.id)
      if (playing?.id === clip.id) setPlaying(null)
      mutate()
      toast.success('Recorte eliminado')
    } catch {
      toast.error('No se pudo eliminar')
    }
  }

  const handleDownloadPack = async (): Promise<boolean> => {
    if (!pack) return false
    setArchiveBusy('zip')
    try {
      await downloadRevisionPackZip(pack, (done, total) => {
        toast.message(`Bajando recortes… ${done}/${total}`)
      })
      toast.success('Carpeta descargada. Puedes borrarla de la app cuando esté a salvo.')
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo descargar la carpeta')
      return false
    } finally {
      setArchiveBusy(null)
    }
  }

  const handleDrivePack = async () => {
    if (!pack) return
    const ok = await handleDownloadPack()
    if (!ok) return
    const url = pack.retention?.drive_folder_url
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
    toast.message('Sube el zip a Drive. Cuando esté, pulsa Borrar todo.')
  }

  const handlePurgePack = async () => {
    if (!pack) return
    const n = pack.retention?.hot_count || pack.clips.filter((c) => c.status === 'hot').length
    if (!confirm(`¿Borrar los ${n} recortes de esta carpeta de la app y de Cloudflare? No se puede deshacer.`)) return
    setArchiveBusy('purge')
    try {
      const result = await revisionApi.purgePack(pack.id, equipoId)
      setPlaying(null)
      mutate()
      toast.success(result.deleted ? `Se borraron ${result.deleted} recortes` : 'No había recortes que borrar')
    } catch {
      toast.error('No se pudo borrar la carpeta')
    } finally {
      setArchiveBusy(null)
    }
  }

  if (!equipoId) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Clapperboard className="h-4 w-4" />
          Revisión
        </h4>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => { setNewFolderParent(folderId); setNewFolderOpen(true) }}>
            <FolderPlus className="h-3.5 w-3.5 mr-1" />
            Carpeta
          </Button>
          <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1" />
            Subir recorte
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Recortes cortos para la charla. El partido entero se queda en el ordenador (Video Análisis).
        A los 30 días del partido se borran de la app y de Cloudflare.
      </p>

      {pack && (pack.retention?.hot_count || 0) > 0 && (
        <PackArchiveBanner
          pack={pack}
          busy={archiveBusy}
          onDownload={handleDownloadPack}
          onDrive={handleDrivePack}
          onPurge={handlePurgePack}
        />
      )}

      {error && !pack && (
        <Card className="p-3 text-sm text-destructive flex items-center justify-between gap-2">
          <span>No se pudo cargar la librería. Puedes reintentar o subir el recorte igual.</span>
          <Button variant="outline" size="sm" onClick={() => mutate()}>Reintentar</Button>
        </Card>
      )}

      {isLoading && !pack && !error && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Cargando recortes…
        </p>
      )}

      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-[200px_1fr]'}`}>
          <div className="space-y-1">
            {(rootFolders.length > 0 ? rootFolders : REVISION_FOLDER_PRESETS[ambito] || []).map((f) => (
              'id' in f ? (
              <FolderRow
                key={f.id}
                folder={f}
                folders={folders}
                selectedId={folderId}
                onSelect={setFolderId}
                onRename={setRenaming}
                onDelete={handleDeleteFolder}
                onAddChild={(id) => { setNewFolderParent(id); setNewFolderOpen(true) }}
              />
              ) : (
                <div key={f.fase} className="flex items-center gap-1 text-sm px-2 py-1.5 rounded-md text-muted-foreground">
                  <Folder className="h-3.5 w-3.5" />
                  {f.nombre}
                </div>
              )
            ))}
          </div>

          <div className="space-y-3 min-w-0">
            {children.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {children.map((c) => (
                  <Button key={c.id} variant={folderId === c.id ? 'default' : 'outline'} size="sm" onClick={() => setFolderId(c.id)}>
                    {c.nombre}
                  </Button>
                ))}
              </div>
            )}

            {playing && clipPlaySrc(playing) && playing.status === 'hot' && (
              <div className="rounded-md overflow-hidden border bg-black">
                <VideoPlayer src={clipPlaySrc(playing)!} standalonePreview />
              </div>
            )}

            {clipsInFolder.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                <Clapperboard className="h-8 w-8 mx-auto mb-2 opacity-30" />
                {isLoading && !pack
                  ? 'Cargando recortes…'
                  : 'No hay recortes en esta carpeta. Córtalos en Video Análisis y envíalos aquí, o súbelos.'}
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {clipsInFolder.map((clip) => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    onPlay={() => setPlaying(clip)}
                    onPresent={() => setSalaClip(clip)}
                    onDelete={() => handleDeleteClip(clip)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva carpeta</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Ej. Pressing alto" />
          </div>
          <DialogFooter>
            <Button onClick={handleCreateFolder}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renaming} onOpenChange={() => setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar carpeta</DialogTitle>
          </DialogHeader>
          <Input
            value={renaming?.nombre || ''}
            onChange={(e) => setRenaming((f) => (f ? { ...f, nombre: e.target.value } : f))}
          />
          <DialogFooter>
            <Button onClick={handleRename}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UploadClipDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        pack={pack}
        folderId={folderId}
        ensurePack={ensurePack}
        onDone={() => { setUploadOpen(false); mutate() }}
      />

      {pack && salaClip && (
        <SalaHostDialog
          pack={pack}
          clip={salaClip}
          equipoId={equipoId}
          onClose={() => setSalaClip(null)}
        />
      )}
    </div>
  )
}

function formatRetentionDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

function PackArchiveBanner({
  pack,
  busy,
  onDownload,
  onDrive,
  onPurge,
}: {
  pack: RevisionPack
  busy: 'zip' | 'purge' | null
  onDownload: () => void
  onDrive: () => void
  onPurge: () => void
}) {
  const retention = pack.retention
  if (!retention) return null
  const urgent = retention.warn && !retention.pending_match
  return (
    <Card className={`p-3 space-y-2 ${urgent ? 'border-amber-400 bg-amber-50' : ''}`}>
      {retention.pending_match ? (
        <p className="text-sm">
          Estos recortes se borran 30 días después del partido. Aún no se ha jugado.
        </p>
      ) : (
        <p className={`text-sm ${urgent ? 'text-amber-900 font-medium' : ''}`}>
          {urgent
            ? `Esta carpeta desaparece el ${formatRetentionDay(retention.expires_at)} (quedan ${retention.days_left} días). Descárgala o súbela a Drive; luego se borra toda junta, no recorte a recorte.`
            : `Caducan el ${formatRetentionDay(retention.expires_at)} (${retention.days_left} días). Aviso 7 días antes; entonces se borran de la app y de Cloudflare.`}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="outline" onClick={onDownload} disabled={busy != null}>
          {busy === 'zip' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
          Descargar carpeta
        </Button>
        {retention.drive_connected && retention.drive_folder_url ? (
          <Button size="sm" variant="outline" onClick={onDrive} disabled={busy != null}>
            <HardDrive className="h-3.5 w-3.5 mr-1" />
            Subir a Drive
          </Button>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            Sin Drive configurado: descarga el zip. Puedes indicar la carpeta en Configuración.
          </span>
        )}
        <Button size="sm" variant="ghost" className="text-destructive" onClick={onPurge} disabled={busy != null}>
          {busy === 'purge' ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
          Borrar todo
        </Button>
      </div>
    </Card>
  )
}

function FolderRow({
  folder,
  folders,
  selectedId,
  onSelect,
  onRename,
  onDelete,
  onAddChild,
  depth = 0,
}: {
  folder: RevisionFolder
  folders: RevisionFolder[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRename: (f: RevisionFolder) => void
  onDelete: (f: RevisionFolder) => void
  onAddChild: (id: string) => void
  depth?: number
}) {
  const kids = folders.filter((f) => f.parent_id === folder.id).sort((a, b) => a.orden - b.orden)
  const active = selectedId === folder.id
  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-md px-2 py-1 text-sm cursor-pointer ${active ? 'bg-muted font-medium' : 'hover:bg-muted/60'}`}
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => onSelect(folder.id)}
      >
        <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate flex-1">{folder.nombre}</span>
        <button className="opacity-0 group-hover:opacity-100 p-0.5" onClick={(e) => { e.stopPropagation(); onRename(folder) }} title="Renombrar">
          <Pencil className="h-3 w-3" />
        </button>
        <button className="opacity-0 group-hover:opacity-100 p-0.5" onClick={(e) => { e.stopPropagation(); onAddChild(folder.id) }} title="Subcarpeta">
          <Plus className="h-3 w-3" />
        </button>
        <button className="opacity-0 group-hover:opacity-100 p-0.5 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(folder) }} title="Eliminar">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {kids.map((k) => (
        <FolderRow
          key={k.id}
          folder={k}
          folders={folders}
          selectedId={selectedId}
          onSelect={onSelect}
          onRename={onRename}
          onDelete={onDelete}
          onAddChild={onAddChild}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

function ClipCard({
  clip,
  onPlay,
  onPresent,
  onDelete,
}: {
  clip: RevisionClip
  onPlay: () => void
  onPresent: () => void
  onDelete: () => void
}) {
  const enDrive = clip.status === 'en_drive'
  const missing = clip.status === 'missing'
  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{clip.titulo}</p>
          {clip.frase && <p className="text-xs text-muted-foreground line-clamp-2">{clip.frase}</p>}
          {(clip.rival_jugador_nombre || clip.rival_jugador_dorsal) && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {clip.rival_jugador_dorsal ? `#${clip.rival_jugador_dorsal} ` : ''}
              {clip.rival_jugador_nombre}
            </p>
          )}
        </div>
        {enDrive ? (
          <Badge variant="secondary">En Drive</Badge>
        ) : missing ? (
          <Badge variant="destructive">Sin archivo</Badge>
        ) : null}
      </div>
      {clip.archive_warning && (
        <p className="text-[11px] text-amber-700">{clip.archive_warning}</p>
      )}
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" onClick={onPlay} disabled={!clipPlaySrc(clip) || clip.status !== 'hot'}>
          Ver
        </Button>
        <Button size="sm" onClick={onPresent} disabled={!clipPlaySrc(clip) || clip.status !== 'hot'}>
          <MonitorPlay className="h-3.5 w-3.5 mr-1" />
          Presentar
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  )
}

function UploadClipDialog({
  open,
  onOpenChange,
  pack,
  folderId,
  ensurePack,
  onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  pack: RevisionPack | undefined
  folderId: string | null
  ensurePack: () => Promise<RevisionPack>
  onDone: () => void
}) {
  const [titulo, setTitulo] = useState('')
  const [frase, setFrase] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)

  const submit = async () => {
    if (!file) return
    if (file.size > 200 * 1024 * 1024) {
      toast.error('El recorte no puede superar 200MB')
      return
    }
    setBusy(true)
    setProgress(0)
    try {
      const current = pack ?? await ensurePack()
      await revisionApi.uploadClip(file, {
        pack_id: current.id,
        equipo_id: current.equipo_id,
        titulo: titulo.trim() || file.name,
        frase: frase.trim() || undefined,
        folder_id: folderId || undefined,
      }, setProgress)
      toast.success('Recorte subido')
      setTitulo('')
      setFrase('')
      setFile(null)
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al subir')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir recorte</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Clips de 1–2 min (~100MB). Cabén 7–10 por partido para una charla de 15–30 min. El partido entero no se sube.
          </p>
          <div className="space-y-1">
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Frase corta</Label>
            <Input value={frase} onChange={(e) => setFrase(e.target.value)} placeholder="Una línea para la charla" />
          </div>
          <Input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          {busy && progress != null ? (
            <p className="text-xs text-muted-foreground">Subiendo… {progress}%</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!file || busy}>{busy ? `Subiendo… ${progress ?? 0}%` : 'Subir'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
