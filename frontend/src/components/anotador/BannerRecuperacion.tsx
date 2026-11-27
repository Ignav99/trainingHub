'use client'

import { IconoGuardado } from './Iconos'
import { Boton, BotonMantener } from './Piezas'
import type { Recuperacion } from './adaptadores'
import { formatHora } from './utils'

interface Props {
  recuperacion: Recuperacion
  onContinuar: () => void
  onDescartar: () => void
}

/** Se muestra una vez tras recargar con datos locales sin enviar. Descartar exige mantener pulsado. */
export function BannerRecuperacion({ recuperacion, onContinuar, onDescartar }: Props) {
  const hora = formatHora(recuperacion.guardadoEn)
  return (
    <div
      role="status"
      className="flex shrink-0 flex-wrap items-center gap-3 border-b-[1.5px] border-info bg-card px-4 py-2"
    >
      <IconoGuardado size={26} className="shrink-0 text-info" />
      <p className="min-w-0 flex-1 text-base font-semibold">
        Recuperamos tu partido guardado en la tablet{hora ? ` · ${hora}` : ''} — ¿Continuar?
        {recuperacion.detalle && <span className="block text-[15px] font-normal text-muted-foreground">{recuperacion.detalle}</span>}
      </p>
      <Boton variante="primario" onClick={onContinuar}>Continuar</Boton>
      <BotonMantener onConfirmar={onDescartar}>Descartar</BotonMantener>
    </div>
  )
}

/** Pantalla de arranque cuando la tablet guardaba un partido que el servidor no tiene tal cual. */
export function PantallaRecuperacion(p: Props) {
  return (
    <div data-superficie="visitante" className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <BannerRecuperacion {...p} />
      <div className="flex flex-1 items-center justify-center px-6 text-center">
        <p className="max-w-[560px] text-base text-muted-foreground">
          Continuar abre el partido tal y como lo dejaste. Descartar borra la copia de la tablet (mantén pulsado):
          queda una copia oculta 24 h por si fue un error.
        </p>
      </div>
    </div>
  )
}
