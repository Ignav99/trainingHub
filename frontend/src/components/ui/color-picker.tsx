'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from './label'

interface ColorPickerProps {
  label?: string
  value: string
  onChange: (color: string) => void
  presets?: string[]
  className?: string
}

const DEFAULT_PRESETS = [
  '#1e3a5f', // Navy
  '#dc2626', // Red
  '#2563eb', // Blue
  '#16a34a', // Green
  '#f59e0b', // Amber
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#0891b2', // Cyan
  '#ea580c', // Orange
  '#171717', // Black
  '#ffffff', // White
  '#6b7280', // Gray
]

function ColorPicker({ label, value, onChange, presets = DEFAULT_PRESETS, className }: ColorPickerProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-md border border-input p-1"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) {
              onChange(e.target.value)
            }
          }}
          className="h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono uppercase"
          maxLength={7}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((color) => (
          <button
            key={color}
            type="button"
            className={cn(
              'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
              value === color ? 'border-ring ring-2 ring-ring ring-offset-2' : 'border-transparent'
            )}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
    </div>
  )
}

export { ColorPicker }
