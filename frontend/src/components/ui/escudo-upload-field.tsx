'use client'

import * as React from 'react'
import { Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TeamCrest } from '@/components/ui/team-crest'

interface EscudoUploadFieldProps {
  /** Current escudo URL (from server) */
  value?: string | null
  /** Team name for initials fallback */
  name: string
  onFileSelect: (file: File) => void
  onClear?: () => void
  disabled?: boolean
  maxSizeMb?: number
  className?: string
}

/**
 * Manual escudo upload with preview. Server removes white background and
 * normalizes to 256×256 PNG on upload.
 */
export function EscudoUploadField({
  value,
  name,
  onFileSelect,
  onClear,
  disabled = false,
  maxSizeMb = 5,
  className,
}: EscudoUploadFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [localPreview, setLocalPreview] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const preview = localPreview || value || null

  const handleFile = (file: File) => {
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes (PNG, JPG, WebP)')
      return
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`Máximo ${maxSizeMb}MB`)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setLocalPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    onFileSelect(file)
  }

  const handleClear = () => {
    setLocalPreview(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
    onClear?.()
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <TeamCrest src={preview} name={name || '?'} size="lg" className="!h-20 !w-20" />
          {preview && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-white shadow hover:bg-destructive/90"
              aria-label="Quitar escudo"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors',
              disabled
                ? 'cursor-not-allowed opacity-50'
                : 'cursor-pointer hover:bg-muted/50 border-muted-foreground/25',
            )}
          >
            <Upload className="mb-1.5 h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium">Subir escudo</span>
            <span className="mt-0.5 text-xs text-muted-foreground">
              PNG, JPG o WebP · fondo blanco se recorta solo · max {maxSizeMb}MB
            </span>
          </button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
