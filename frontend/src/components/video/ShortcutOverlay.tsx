'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ShortcutOverlayProps {
  open: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { section: 'Reproducción', items: [
    { keys: 'Espacio', desc: 'Play / Pause' },
    { keys: '← / →', desc: 'Saltar ±5s' },
    { keys: 'Shift + ← / →', desc: 'Saltar ±1 frame' },
  ]},
  { section: 'Tagging', items: [
    { keys: '1-9', desc: 'Tag rápido (categoría)' },
    { keys: 'Shift + 1-9', desc: 'Asignar descriptor' },
    { keys: 'I', desc: 'Marcar In-point' },
    { keys: 'O', desc: 'Marcar Out-point + crear tag' },
    { keys: '[ / ]', desc: 'Ir a tag anterior / siguiente' },
    { keys: 'Delete', desc: 'Eliminar tag seleccionado' },
    { keys: 'Escape', desc: 'Cancelar tagging' },
  ]},
  { section: 'Modo', items: [
    { keys: 'D', desc: 'Alternar modo dibujo' },
    { keys: 'V', desc: 'Herramienta selección' },
    { keys: 'C', desc: 'Crear clip (modo general)' },
    { keys: 'F', desc: 'Freeze frame (modo clip)' },
    { keys: '?', desc: 'Mostrar/ocultar atajos' },
  ]},
  { section: 'Dibujo', items: [
    { keys: 'Ctrl + Z', desc: 'Deshacer' },
    { keys: 'Ctrl + Shift + Z', desc: 'Rehacer' },
  ]},
]

export function ShortcutOverlay({ open, onClose }: ShortcutOverlayProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={ref}
        className="bg-gray-900 border border-white/20 rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white">Atajos de teclado</h3>
          <button
            className="text-white/40 hover:text-white/70 transition-colors"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Sections */}
        <div className="p-4 space-y-4">
          {SHORTCUTS.map((section) => (
            <div key={section.section}>
              <h4 className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2">
                {section.section}
              </h4>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <div
                    key={item.keys}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-xs text-white/60">{item.desc}</span>
                    <kbd className="text-[10px] font-mono text-white/80 bg-white/10 border border-white/20 px-2 py-0.5 rounded">
                      {item.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
