'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Play, GripVertical, ListMusic } from 'lucide-react'
import { toast } from 'sonner'
import { videoPlaylistsApi, type VideoPlaylist } from '@/lib/api/videoPlaylists'

interface PlaylistManagerProps {
  equipoId: string
  onPlayTag: (tagId: string) => void
}

export function PlaylistManager({ equipoId, onPlayTag }: PlaylistManagerProps) {
  const [playlists, setPlaylists] = useState<VideoPlaylist[]>([])
  const [activePlaylist, setActivePlaylist] = useState<VideoPlaylist | null>(null)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchPlaylists = async () => {
    try {
      const res = await videoPlaylistsApi.list(equipoId)
      setPlaylists(res.data)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchPlaylists()
  }, [equipoId])

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      await videoPlaylistsApi.create(equipoId, { equipo_id: equipoId, nombre: newName.trim() })
      setNewName('')
      await fetchPlaylists()
      toast.success('Playlist creada')
    } catch {
      toast.error('Error al crear playlist')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await videoPlaylistsApi.delete(id)
      if (activePlaylist?.id === id) setActivePlaylist(null)
      await fetchPlaylists()
      toast.success('Playlist eliminada')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const handleOpenPlaylist = async (playlist: VideoPlaylist) => {
    try {
      setLoading(true)
      const full = await videoPlaylistsApi.get(playlist.id)
      setActivePlaylist(full)
    } catch {
      toast.error('Error al cargar playlist')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    try {
      await videoPlaylistsApi.removeItem(itemId)
      if (activePlaylist) {
        const refreshed = await videoPlaylistsApi.get(activePlaylist.id)
        setActivePlaylist(refreshed)
      }
      toast.success('Item eliminado')
    } catch {
      toast.error('Error')
    }
  }

  // Playlist detail view
  if (activePlaylist) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
          <button
            className="text-[10px] text-white/50 hover:text-white/80"
            onClick={() => setActivePlaylist(null)}
          >
            ← Atrás
          </button>
          <span className="text-xs font-medium text-white truncate flex-1">
            {activePlaylist.nombre}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!activePlaylist.items || activePlaylist.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/30 text-xs p-4 text-center">
              <ListMusic className="h-6 w-6 mb-2 opacity-50" />
              <p>Playlist vacía</p>
              <p className="mt-1 text-[10px]">Añade tags desde la pestaña Tags</p>
            </div>
          ) : (
            <div className="p-1">
              {activePlaylist.items.map((item, i) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 transition-colors"
                >
                  <GripVertical className="h-3 w-3 text-white/20 shrink-0" />
                  <span className="text-[10px] text-white/40 w-4">{i + 1}</span>
                  <button
                    className="flex-1 text-left text-xs text-white/70 hover:text-white truncate"
                    onClick={() => onPlayTag(item.tag_id)}
                  >
                    Tag {item.tag_id.slice(0, 8)}...
                  </button>
                  <button
                    className="text-white/20 hover:text-red-400 p-0.5"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Playlists list view
  return (
    <div className="flex flex-col h-full">
      {/* Create */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/10">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="Nueva playlist..."
          className="flex-1 bg-transparent text-[11px] text-white/80 placeholder:text-white/30 outline-none"
        />
        <button
          className="text-white/40 hover:text-white/70 p-0.5"
          onClick={handleCreate}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/30 text-xs p-4 text-center">
            <ListMusic className="h-6 w-6 mb-2 opacity-50" />
            <p>No hay playlists</p>
          </div>
        ) : (
          <div className="p-1">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => handleOpenPlaylist(pl)}
              >
                <Play className="h-3 w-3 text-white/30 shrink-0" />
                <span className="flex-1 text-xs text-white/70 truncate">{pl.nombre}</span>
                <button
                  className="text-white/20 hover:text-red-400 p-0.5"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(pl.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
