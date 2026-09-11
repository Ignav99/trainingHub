'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, FileText, Loader2, Presentation } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportDossierMenuProps {
  onPdf: () => void | Promise<void>
  onPresentacion: () => void | Promise<void>
  onPresentar?: () => void | Promise<void>
  onPresentarTodo?: () => void | Promise<void>
  exporting?: boolean
  presenting?: boolean
  presentingTodo?: boolean
}

export function ExportDossierMenu({
  onPdf,
  onPresentacion,
  onPresentar,
  onPresentarTodo,
  exporting,
  presenting,
  presentingTodo,
}: ExportDossierMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const busy = Boolean(presenting || presentingTodo)

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {onPresentar && (
        <Button
          type="button"
          variant="club"
          size="sm"
          className="h-8 text-xs"
          disabled={busy}
          onClick={() => void onPresentar()}
        >
          {presenting ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Presentation className="mr-1.5 h-3.5 w-3.5" />
          )}
          {presenting ? 'Abriendo sala…' : 'Presentar'}
        </Button>
      )}
      {onPresentarTodo && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={busy}
          title="Primero el informe del rival, luego nuestro plan"
          data-testid="presentar-todo"
          onClick={() => void onPresentarTodo()}
        >
          {presentingTodo ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Presentation className="mr-1.5 h-3.5 w-3.5" />
          )}
          {presentingTodo ? 'Abriendo sala…' : 'Presentar todo'}
        </Button>
      )}
      <div ref={rootRef} className="relative">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={exporting}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          {exporting ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
          )}
          {exporting ? 'Creando presentación…' : 'Exportar'}
        </Button>
        {open && !exporting && (
          <div
            role="menu"
            className="absolute right-0 z-30 mt-1 w-64 rounded-lg border border-border bg-background py-1 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-muted/70"
              onClick={() => {
                setOpen(false)
                void onPdf()
              }}
            >
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                <span className="block text-xs font-medium">PDF</span>
                <span className="block text-[11px] text-muted-foreground">Para enviar o archivar</span>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-muted/70"
              onClick={() => {
                setOpen(false)
                void onPresentacion()
              }}
            >
              <Presentation className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                <span className="block text-xs font-medium">Descargar PPT</span>
                <span className="block text-[11px] text-muted-foreground">PowerPoint o Google Slides</span>
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
