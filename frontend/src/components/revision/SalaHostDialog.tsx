'use client'

import { useEffect, useState } from 'react'
import { Copy, MonitorPlay } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { revisionApi, type RevisionClip, type RevisionPack, type RevisionSession } from '@/lib/api/revision'

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
      .then((s) => { if (!cancelled) setSession(s) })
      .catch(() => { if (!cancelled) setError('No se pudo abrir la sala') })
    return () => { cancelled = true }
  }, [equipoId, pack.id, clip.id])

  const salaUrl = session
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/revision/${session.code}`
    : ''
  const hostUrl = session ? `${salaUrl}?role=host` : ''
  const qrSrc = salaUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(salaUrl)}`
    : ''

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copiado')
    } catch {
      toast.error('No se pudo copiar')
    }
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
        {!session && !error && <p className="text-sm text-muted-foreground">Abriendo sala…</p>}
        {session && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              El portátil va a la TV por HDMI. La tablet entra con el mismo 5G del móvil (no hace falta Wi‑Fi del club).
            </p>
            <div className="flex flex-col items-center gap-2">
              <p className="text-3xl font-mono tracking-[0.3em] font-semibold">{session.code}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt={`Código QR sala ${session.code}`} width={220} height={220} className="rounded-md border" />
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => window.open(hostUrl, '_blank', 'noopener')}>
                Abrir en el portátil (TV)
              </Button>
              <Button variant="outline" onClick={() => copy(salaUrl)}>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copiar enlace de la tablet
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Audio sale del PC. En la tablet el vídeo va silenciado. El lápiz pinta en vivo y no se guarda encima del recorte.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
