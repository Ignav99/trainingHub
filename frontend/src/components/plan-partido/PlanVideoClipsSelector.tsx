'use client'

import { useState, useEffect } from 'react'
import { Loader2, Film, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { videosApi } from '@/lib/api/videos'
import type { VideoPartido } from '@/types'

interface Props {
  partidoId: string
  equipoId: string
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function PlanVideoClipsSelector({ partidoId, equipoId, selectedIds, onChange }: Props) {
  const [videos, setVideos] = useState<VideoPartido[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!partidoId || !equipoId || !open) return
    setLoading(true)
    videosApi.list(partidoId, equipoId).then(r => {
      setVideos(r.data)
    }).catch(() => setVideos([])).finally(() => setLoading(false))
  }, [partidoId, equipoId, open])

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id])
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Film className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Clips de video vinculados</span>
        <span className="text-xs text-muted-foreground">({selectedIds.length})</span>
      </div>
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedIds.map(id => (
            <span key={id} className="inline-flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded">
              {id.slice(0, 8)}...
              <button onClick={() => toggle(id)}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        <Plus className="h-4 w-4 mr-1" /> {open ? 'Cerrar' : 'Añadir clips'}
      </Button>

      {open && (
        <Card className="mt-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Clips disponibles del partido</CardTitle>
          </CardHeader>
          <CardContent className="max-h-60 overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && videos.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay clips de video para este partido.</p>
            )}
            <div className="space-y-2">
              {videos.map(v => (
                <label key={v.id} className="flex items-start gap-2 p-2 border rounded hover:bg-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(v.id)}
                    onChange={() => toggle(v.id)}
                  />
                  <div className="text-sm">
                    <p className="font-medium">{v.titulo}</p>
                    <p className="text-xs text-muted-foreground">{v.contexto}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
