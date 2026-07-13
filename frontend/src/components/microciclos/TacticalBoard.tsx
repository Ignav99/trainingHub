'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface TacticalBoardProps {
  value?: string
  onChange?: (base64: string) => void
  height?: number
}

export function TacticalBoard({ value, onChange, height = 260 }: TacticalBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#ffffff')
  const [lineWidth, setLineWidth] = useState(2)
  const [hasDrawing, setHasDrawing] = useState(false)

  const drawPitch = useCallback((ctx: CanvasRenderingContext2D, width: number, h: number) => {
    // Fondo verde
    ctx.fillStyle = '#1a6b2e'
    ctx.fillRect(0, 0, width, h)

    // Líneas blancas semitransparentes
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1.5

    // Borde campo
    const pad = 16
    ctx.strokeRect(pad, pad, width - pad * 2, h - pad * 2)

    // Línea central
    ctx.beginPath()
    ctx.moveTo(width / 2, pad)
    ctx.lineTo(width / 2, h - pad)
    ctx.stroke()

    // Círculo central
    ctx.beginPath()
    ctx.arc(width / 2, h / 2, 36, 0, Math.PI * 2)
    ctx.stroke()

    // Áreas
    const areaW = 80
    const areaH = 120
    ctx.strokeRect(pad, h / 2 - areaH / 2, areaW, areaH)
    ctx.strokeRect(width - pad - areaW, h / 2 - areaH / 2, areaW, areaH)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawPitch(ctx, width, height)

    if (value) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0)
        setHasDrawing(true)
      }
      img.src = value
    }
  }, [value, height, drawPitch])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const pos = getPos(e)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const pos = getPos(e)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    setHasDrawing(true)
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.closePath()
    if (onChange) {
      onChange(canvas.toDataURL('image/png'))
    }
  }

  const clear = () => {
    const canvas = canvasRef.current
    const container = containerRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !container || !ctx) return
    drawPitch(ctx, container.clientWidth, height)
    setHasDrawing(false)
    if (onChange) onChange('')
  }

  const colors = ['#ffffff', '#ffeb3b', '#ff5252', '#448aff', '#69f0ae']

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border ${color === c ? 'border-foreground ring-1 ring-foreground' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-20"
          />
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={clear}>
            Limpiar
          </Button>
        </div>
      </div>
      <div ref={containerRef} className="w-full rounded-lg overflow-hidden border border-white/10">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <p className="text-[10px] text-muted-foreground">Dibuja sobre el campo para explicar la fase táctica.</p>
    </Card>
  )
}
