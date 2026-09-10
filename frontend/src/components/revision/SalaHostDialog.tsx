'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, MonitorPlay } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { revisionApi, type RevisionClip, type RevisionPack, type RevisionSession } from '@/lib/api/revision'
import { SalaStage } from './SalaStage'

interface SalaHostDialogProps {
  pack: RevisionPack
  clip: RevisionClip
  equipoId: string
  onClose: () => void
}

export function SalaHostDialog({ pack, clip, equipoId, onClose }: SalaHostDialogProps) {
  const [session, setSession] = useState<RevisionSession | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    revisionApi.createSession({ equipo_id: equipoId, pack_id: pack.id, clip_id: clip.id })
      .then(async (s) => {
        if (cancelled) return
        try {
          const full = await revisionApi.getSession(s.code)
          if (cancelled) return
          setSession({
            ...full,
            pack: full.pack || pack,
            current_clip: full.current_clip || clip,
            current_clip_id: clip.id,
          })
        } catch {
          if (cancelled) return
          setSession({
            ...s,
            pack,
            current_clip: clip,
            current_clip_id: clip.id,
          })
        }
      })
      .catch(() => { if (!cancelled) setError('No se pudo abrir la sala') })
    return () => { cancelled = true }
  }, [equipoId, pack.id, clip.id])

  if (session && typeof document !== 'undefined') {
    return createPortal(
      <SalaStage
        code={session.code}
        role="host"
        initialSession={session}
        onClose={onClose}
      />,
      document.body,
    )
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorPlay className="h-4 w-4" />
            Sala · {clip.titulo}
          </DialogTitle>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!session && !error && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Abriendo sala… al escanear el QR, esta pantalla pasa sola a la revisión.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
