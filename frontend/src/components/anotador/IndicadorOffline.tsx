import { IconoGuardado, IconoSincronizando, IconoSinConexion } from './Iconos'
import { Boton } from './Piezas'
import type { PartidoOffline } from './useOfflinePartidos'

/**
 * «Listo para jugar sin conexión ✓» / «Preparar» con progreso, y «N cambios sin enviar».
 * `estado` undefined = aún no se sabe (no se pinta nada).
 */
export function IndicadorOffline({ estado, onPreparar }: { estado?: PartidoOffline; onPreparar?: () => void }) {
  if (!estado || estado.fase.fase === 'desconocido') return null
  const f = estado.fase
  return (
    <div className="flex flex-col items-end gap-1">
      {estado.sinEnviar > 0 && (
        <span role="status" className="flex items-center gap-1.5 text-[15px] font-bold text-warning">
          <IconoSincronizando size={20} />
          {estado.sinEnviar === 1 ? '1 cambio sin enviar' : `${estado.sinEnviar} cambios sin enviar`}
        </span>
      )}
      {f.fase === 'listo' && (
        <span className="flex items-center gap-1.5 text-[15px] font-semibold text-success">
          <IconoGuardado size={20} /> Listo para jugar sin conexión ✓
        </span>
      )}
      {f.fase === 'preparando' && (
        <span role="status" className="flex items-center gap-1.5 text-[15px] font-semibold text-info">
          <IconoSincronizando size={20} className="motion-safe:animate-spin" />
          Preparando{f.total > 0 ? ` · ${f.hechos}/${f.total}` : '…'}
        </span>
      )}
      {(f.fase === 'no' || f.fase === 'error') && (
        <>
          <span className="flex items-center gap-1.5 text-[15px] font-semibold text-info">
            <IconoSinConexion size={20} /> {f.fase === 'error' ? 'No se preparó' : 'Sin descargar'}
          </span>
          {onPreparar && <Boton onClick={onPreparar} aria-label="Preparar para jugar sin conexión">Preparar</Boton>}
          {f.fase === 'error' && <span className="max-w-[260px] text-right text-sm text-muted-foreground">{f.mensaje}</span>}
        </>
      )}
    </div>
  )
}
