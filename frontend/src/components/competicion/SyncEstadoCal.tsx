import { AlertCircle, RefreshCw } from 'lucide-react'
import { Estado } from '@/components/ui/estado'
import type { SyncStatusResponse } from '@/lib/api/rfef'

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

interface Props {
  estado: SyncStatusResponse
  reintentando: boolean
  onReintentar: () => void
}

/** Estado de la sincronización en una línea de texto. */
export function SyncEstadoCal({ estado, reintentando, onReintentar }: Props) {
  const completo = estado.status === 'complete'
  const puedeReintentar = estado.status === 'incomplete' && (estado.actas_fallidas?.length ?? 0) > 0
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border pb-2 text-sm">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
        {completo ? (
          <Estado tipo="disponible" className="text-foreground">
            Datos completos: <span className="tabular-nums">{estado.actas_completas}/{estado.total_actas}</span> actas
          </Estado>
        ) : (
          <Estado tipo="duda" className="text-foreground">
            <span className="tabular-nums">{estado.actas_completas}/{estado.total_actas}</span> actas completas ({estado.porcentaje_completo}%)
          </Estado>
        )}
        {estado.ultima_sync_actas && <span>Última sincronización: {fecha(estado.ultima_sync_actas)}</span>}
        {estado.ultima_sync_sanciones && (
          <span>
            Comité: {fecha(estado.ultima_sync_sanciones)}
            {estado.sanciones_jornadas?.length ? ` (J${estado.sanciones_jornadas.join(',')})` : ''}
          </span>
        )}
      </p>
      {puedeReintentar && (
        <button
          type="button"
          onClick={onReintentar}
          disabled={reintentando}
          className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-primary underline underline-offset-4 disabled:opacity-50"
        >
          {reintentando ? <RefreshCw aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" />}
          {reintentando ? 'Reintentando...' : 'Reintentar actas'}
        </button>
      )}
    </div>
  )
}
