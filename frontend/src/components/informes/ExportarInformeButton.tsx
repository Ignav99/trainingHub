'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { informesApi, type InformeProfundidad, type InformeTipo } from '@/lib/api/informes'
import { useHealPizarras } from '@/components/informes/HealPizarrasGate'
import { useEquipoStore } from '@/stores/equipoStore'
import { AMBITO_COMPETICION, type PartidoAmbito } from '@/lib/partidoAmbito'
import { cn } from '@/lib/utils'

export function ExportarInformeButton({
  tipo,
  ambito = AMBITO_COMPETICION,
  jugadorId,
  microcicloId,
  fechaDesde,
  fechaHasta,
  profundidad,
  label = 'Exportar PDF',
  variant = 'outline',
  size = 'sm',
  className,
}: {
  tipo: InformeTipo
  ambito?: PartidoAmbito | string
  jugadorId?: string
  microcicloId?: string
  fechaDesde?: string
  fechaHasta?: string
  profundidad?: InformeProfundidad
  label?: string
  variant?: 'outline' | 'default' | 'ghost'
  size?: 'sm' | 'default'
  className?: string
}) {
  const equipoActivo = useEquipoStore((s) => s.equipoActivo)
  const [busy, setBusy] = useState(false)
  const { heal, gate } = useHealPizarras()

  const onClick = async () => {
    if (!equipoActivo?.id) {
      toast.error('Selecciona un equipo')
      return
    }
    setBusy(true)
    try {
      if (tipo === 'microciclo' && microcicloId) {
        await heal(microcicloId)
      }
      await informesApi.download({
        tipo,
        equipo_id: equipoActivo.id,
        ambito,
        jugador_id: jugadorId,
        microciclo_id: microcicloId,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        profundidad: profundidad || (tipo === 'microciclo' ? 'extendido' : 'estandar'),
      })
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo generar el informe')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {gate}
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={onClick}
        disabled={busy}
        className={cn(className)}
      >
        {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
        {label}
      </Button>
    </>
  )
}
