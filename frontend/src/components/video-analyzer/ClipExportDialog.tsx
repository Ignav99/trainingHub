'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface ClipExportDialogProps {
  open: boolean
  clipTitle: string
}

export function ClipExportDialog({ open, clipTitle }: ClipExportDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Exportando clip</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-muted-foreground text-center">
            Exportando &ldquo;{clipTitle}&rdquo;...
          </p>
          <p className="text-xs text-muted-foreground">
            No cierres esta ventana hasta que se descargue
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
