'use client'

import { cn } from '@/lib/utils'
import type { EstadoCierre } from './adaptadores'
import { IconoErrorTarjeta, IconoGuardado, IconoSincronizando } from './Iconos'
import { Boton } from './Piezas'

interface Props {
  cierre: EstadoCierre
  onReintentar: () => void
  className?: string
}

/**
 * Dónde está el cierre del partido. Distingue SIEMPRE «guardado en la tablet» de «enviado al servidor»:
 * el delegado nunca debe creer que el servidor lo tiene si solo está en local.
 */
export function EstadoEnvio({ cierre, onReintentar, className }: Props) {
  const n = cierre.pendientes
  const cola = n === 1 ? '1 cambio por enviar' : `${n} cambios por enviar`
  if (cierre.fase === 'servidor') {
    return (
      <div role="status" className={cn('flex items-start gap-3 rounded-lg border-[1.5px] border-success bg-card p-3', className)}>
        <IconoGuardado size={28} className="mt-0.5 shrink-0 text-success" />
        <div className="min-w-0">
          <p className="text-lg font-bold">Cerrado y enviado al servidor ✓</p>
          <p className="text-[15px] text-muted-foreground">El informe ya tiene el partido. También queda copia en la tablet.</p>
        </div>
      </div>
    )
  }
  if (cierre.fase === 'enviando') {
    return (
      <div role="status" className={cn('flex items-start gap-3 rounded-lg border-[1.5px] border-info bg-card p-3', className)}>
        <IconoSincronizando size={28} className="mt-0.5 shrink-0 text-info motion-safe:animate-spin" />
        <div className="min-w-0">
          <p className="text-lg font-bold">Enviando al servidor…</p>
          <p className="text-[15px] text-muted-foreground">Primero se guarda en la tablet y después se envía.</p>
        </div>
      </div>
    )
  }
  if (cierre.fase === 'fallo') {
    return (
      <div role="alert" className={cn('rounded-lg border-[1.5px] border-destructive bg-card p-3', className)}>
        <p className="flex items-center gap-2 text-lg font-bold"><IconoErrorTarjeta size={28} className="shrink-0 text-destructive" />No se pudo guardar el cierre en la tablet</p>
        <p className="mt-1 text-[15px] text-muted-foreground">El partido sigue en pantalla. No cierres la página: pulsa «Reintentar» o avisa a quien te ayude.</p>
        <Boton variante="primario" className="mt-3" onClick={onReintentar}>Reintentar</Boton>
      </div>
    )
  }
  return (
    <div role="status" className={cn('rounded-lg border-[1.5px] border-warning bg-card p-3', className)}>
      <p className="flex items-center gap-2 text-lg font-bold"><IconoGuardado size={28} className="shrink-0 text-warning" />Cerrado y guardado en la tablet</p>
      <p className="mt-1 text-[15px] text-muted-foreground">
        Todavía NO está en el servidor{n > 0 ? ` · ${cola}` : ''}. Se enviará solo al volver la conexión; no borres los datos del navegador.
      </p>
      <Boton variante="primario" className="mt-3" onClick={onReintentar}>Enviar ahora</Boton>
    </div>
  )
}
