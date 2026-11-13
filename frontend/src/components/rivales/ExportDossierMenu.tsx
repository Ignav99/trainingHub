'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, FileText, Loader2, Presentation } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportDossierMenuProps {
  onPdf: () => void | Promise<void>
  onPresentacion: () => void | Promise<void>
  /** false = solo en este ordenador. true = sala con tablet. */
  onPresentar?: (conTablet: boolean) => void | Promise<void>
  onPresentarTodo?: (conTablet: boolean) => void | Promise<void>
  exporting?: boolean
  presenting?: boolean
  presentingTodo?: boolean
}

function PresentarChoice({
  label,
  busyLabel,
  busy,
  disabled,
  variant,
  title,
  testId,
  onChoose,
}: {
  label: string
  busyLabel: string
  busy?: boolean
  disabled?: boolean
  variant: 'club' | 'outline'
  title?: string
  testId?: string
  onChoose: (conTablet: boolean) => void | Promise<void>
}) {
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

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant={variant}
        size="sm"
        className="h-8 text-xs"
        disabled={disabled}
        title={title}
        data-testid={testId}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        {busy ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Presentation className="mr-1.5 h-3.5 w-3.5" />
        )}
        {busy ? busyLabel : label}
      </Button>
      {open && !busy && (
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
              void onChoose(false)
            }}
          >
            <Presentation className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="block text-xs font-medium">Solo en este ordenador</span>
              <span className="block text-[11px] text-muted-foreground">La charla se ve aquí. Sin sala ni QR.</span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-muted/70"
            onClick={() => {
              setOpen(false)
              void onChoose(true)
            }}
          >
            <Presentation className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="block text-xs font-medium">Con tablet</span>
              <span className="block text-[11px] text-muted-foreground">Sale un QR. La tablet sigue la misma diapositiva.</span>
            </span>
          </button>
        </div>
      )}
    </div>
  )
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
    <div className="flex w-full min-w-0 max-w-full flex-wrap items-center justify-end gap-1.5">
      {onPresentar && (
        <PresentarChoice
          label="Presentar"
          busyLabel="Abriendo sala…"
          busy={presenting}
          disabled={busy}
          variant="club"
          onChoose={onPresentar}
        />
      )}
      {onPresentarTodo && (
        <PresentarChoice
          label="Presentar todo"
          busyLabel="Abriendo sala…"
          busy={presentingTodo}
          disabled={busy}
          variant="outline"
          title="Primero el informe del rival, luego nuestro plan"
          testId="presentar-todo"
          onChoose={onPresentarTodo}
        />
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
