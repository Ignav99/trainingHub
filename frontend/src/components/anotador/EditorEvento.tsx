'use client'

import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { TIPO_ABP_OPTIONS, TIPO_GOL_OPTIONS, ZONA_OPTIONS } from '@/lib/anotador'
import {
  ajustarMinuto, cambiarJugador, cambiarParte, cambiarTipoLado, camposJugador, ladoDe, validarBorrador,
  type EventoEditable, type TipoEvento,
} from './edicionEvento'
import { AvatarJugador, FichaJugador, type DatosFicha } from './FichaJugador'
import { Boton, BotonMantener, Chip, Hoja, Rotulo, Segmentado } from './Piezas'

interface Props {
  abierta: boolean
  modo: 'editar' | 'crear'
  evento: EventoEditable | null
  jugadores: DatosFicha[]
  mostrarFoto: boolean
  rivalDorsales: number[]
  onGuardar: (ev: EventoEditable) => void
  onBorrar: (id: string) => void
  onCerrar: () => void
}

const TIPOS_CREAR: { valor: TipoEvento; etiqueta: string }[] = [
  { valor: 'gol', etiqueta: 'Gol' },
  { valor: 'amarilla', etiqueta: 'Amarilla' },
  { valor: 'roja', etiqueta: 'Roja' },
  { valor: 'corner', etiqueta: 'Córner' },
  { valor: 'falta', etiqueta: 'Falta' },
]

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <Rotulo>{titulo}</Rotulo>
      {children}
    </section>
  )
}

function SelectorJugador({
  jugadores, valor, onChange, mostrarFoto, opcional, excluir,
}: {
  jugadores: DatosFicha[]
  valor?: string
  onChange: (id: string | undefined) => void
  mostrarFoto: boolean
  opcional?: boolean
  excluir?: string
}) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto overscroll-x-contain pb-1">
      {opcional && (
        <Chip className="mx-1 mt-3 shrink-0 self-start" activo={!valor} onClick={() => onChange(undefined)}>Ninguno</Chip>
      )}
      {jugadores.filter((j) => j.id !== excluir).map((j) => (
        <FichaJugador
          key={j.id}
          jugador={j}
          tam="banquillo"
          mostrarFoto={mostrarFoto}
          seleccionado={valor === j.id}
          onClick={() => onChange(valor === j.id && opcional ? undefined : j.id)}
        />
      ))}
    </div>
  )
}

export function EditorEvento({
  abierta, modo, evento, jugadores, mostrarFoto, rivalDorsales, onGuardar, onBorrar, onCerrar,
}: Props) {
  const [d, setD] = useState<EventoEditable | null>(evento)
  const [dorsalTexto, setDorsalTexto] = useState('')
  useEffect(() => {
    setD(evento)
    setDorsalTexto(evento?.rivalDorsal != null ? String(evento.rivalDorsal) : '')
  }, [evento, abierta])

  if (!d) return null
  const lado = ladoDe(d)
  const campos = camposJugador(d)
  const errores = validarBorrador(d)
  const esGol = d.type === 'gol' || d.type === 'gol_contra'
  const esCambio = d.type === 'cambio'
  const tipoBase: TipoEvento = d.type === 'gol_contra' ? 'gol' : d.type

  const poner = (next: EventoEditable) => setD(next)

  return (
    <Hoja
      abierta={abierta}
      onCerrar={onCerrar}
      titulo={modo === 'crear' ? 'Añadir evento olvidado' : 'Editar evento'}
      ancho={820}
      pie={
        <div className="flex flex-wrap items-center gap-3">
          {errores.length > 0 && (
            <p role="alert" className="min-w-0 flex-1 text-[15px] font-semibold text-destructive">{errores[0]}</p>
          )}
          <div className="ml-auto flex items-center gap-3">
            {modo === 'editar' && (
              <BotonMantener onConfirmar={() => onBorrar(d.id)}>Eliminar</BotonMantener>
            )}
            <Boton onClick={onCerrar}>Cancelar</Boton>
            <Boton variante="primario" grande disabled={errores.length > 0} onClick={() => onGuardar(d)} className="min-w-40">
              {modo === 'crear' ? 'Añadir' : 'Guardar'}
            </Boton>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {!esCambio && (
          <div className="grid gap-4 landscape:grid-cols-[1fr_260px]">
            <Bloque titulo="Qué pasó">
              <div className="flex flex-wrap gap-2">
                {TIPOS_CREAR.map((t) => (
                  <Chip key={t.valor} activo={tipoBase === t.valor} onClick={() => poner(cambiarTipoLado(d, t.valor, lado))}>
                    {t.etiqueta}
                  </Chip>
                ))}
              </div>
            </Bloque>
            <Bloque titulo="Equipo">
              <Segmentado
                etiqueta="Equipo"
                valor={lado}
                onChange={(l) => poner(cambiarTipoLado(d, tipoBase, l))}
                opciones={[{ valor: 'us', etiqueta: 'Nosotros' }, { valor: 'rival', etiqueta: 'Rival' }]}
              />
            </Bloque>
          </div>
        )}

        <div className="grid gap-4 landscape:grid-cols-[1fr_260px]">
          <Bloque titulo="Minuto">
            <div className="grid grid-cols-[56px_56px_1fr_56px_56px] items-stretch gap-2">
              <Boton aria-label="Restar 5 minutos" className="px-0" onClick={() => poner(ajustarMinuto(d, -5))}>−5</Boton>
              <Boton aria-label="Restar 1 minuto" className="px-0" onClick={() => poner(ajustarMinuto(d, -1))}><Minus className="h-5 w-5" strokeWidth={1.5} /></Boton>
              <div className="flex min-h-14 items-center justify-center rounded-lg border-[1.5px] border-line bg-sunken text-3xl font-extrabold tabular-nums" aria-live="polite">{d.minute}′</div>
              <Boton aria-label="Sumar 1 minuto" className="px-0" onClick={() => poner(ajustarMinuto(d, 1))}><Plus className="h-5 w-5" strokeWidth={1.5} /></Boton>
              <Boton aria-label="Sumar 5 minutos" className="px-0" onClick={() => poner(ajustarMinuto(d, 5))}>+5</Boton>
            </div>
          </Bloque>
          <Bloque titulo="Parte">
            <Segmentado
              etiqueta="Parte"
              valor={d.half}
              onChange={(p) => poner(cambiarParte(d, p))}
              opciones={[{ valor: 1, etiqueta: '1ª parte' }, { valor: 2, etiqueta: '2ª parte' }]}
            />
          </Bloque>
        </div>

        {campos.principal && !esCambio && (
          <Bloque titulo={d.type === 'gol' ? 'Goleador' : 'Jugador'}>
            <SelectorJugador
              jugadores={jugadores}
              valor={d.convId}
              mostrarFoto={mostrarFoto}
              onChange={(id) => poner(cambiarJugador(d, 'convId', id))}
            />
          </Bloque>
        )}

        {campos.secundario === 'asiste' && (
          <Bloque titulo="Asistente (opcional)">
            <SelectorJugador
              jugadores={jugadores}
              valor={d.relatedConvId}
              mostrarFoto={mostrarFoto}
              opcional
              excluir={d.convId}
              onChange={(id) => poner(cambiarJugador(d, 'relatedConvId', id))}
            />
          </Bloque>
        )}

        {campos.dorsalRival && (
          <Bloque titulo="Dorsal rival (opcional)">
            <div className="flex flex-wrap items-center gap-2">
              <Chip activo={d.rivalDorsal == null} onClick={() => { setDorsalTexto(''); poner({ ...d, rivalDorsal: undefined }) }}>Sin dorsal</Chip>
              {rivalDorsales.map((n) => (
                <Chip key={n} activo={d.rivalDorsal === n} onClick={() => { setDorsalTexto(String(n)); poner({ ...d, rivalDorsal: n }) }}>
                  <span className="tabular-nums">{n}</span>
                </Chip>
              ))}
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                aria-label="Otro dorsal rival"
                placeholder="Otro"
                value={dorsalTexto}
                onChange={(e) => {
                  const t = e.target.value.replace(/\D/g, '').slice(0, 2)
                  setDorsalTexto(t)
                  poner({ ...d, rivalDorsal: t === '' ? undefined : parseInt(t, 10) })
                }}
                className="min-h-12 w-24 rounded-lg border-[1.5px] border-line bg-background px-3 text-center text-xl font-bold tabular-nums"
              />
            </div>
          </Bloque>
        )}

        {esGol && (
          <>
            <Bloque titulo="Cómo fue">
              <div className="flex flex-wrap gap-2">
                {TIPO_GOL_OPTIONS.map((o) => (
                  <Chip key={o.value} activo={!d.es_abp && (d.tipo_gol || 'otro') === o.value} onClick={() => poner({ ...d, es_abp: false, tipo_gol: o.value, tipo_abp: undefined })}>{o.label}</Chip>
                ))}
              </div>
            </Bloque>
            <Bloque titulo="Balón parado">
              <div className="flex flex-wrap gap-2">
                {TIPO_ABP_OPTIONS.map((o) => (
                  <Chip key={o.value} activo={!!d.es_abp && (d.tipo_abp || 'corner') === o.value} onClick={() => poner({ ...d, es_abp: true, tipo_abp: o.value, tipo_gol: undefined })}>{o.label}</Chip>
                ))}
              </div>
            </Bloque>
            <Bloque titulo="Zona de la portería">
              <div className="flex flex-wrap gap-2">
                {ZONA_OPTIONS.map((o) => (
                  <Chip key={o.value} activo={(d.zona || 'central') === o.value} onClick={() => poner({ ...d, zona: o.value })}>{o.label}</Chip>
                ))}
              </div>
            </Bloque>
          </>
        )}

        {esCambio && (
          <div className="flex flex-wrap items-center gap-6">
            {([['Sale', d.convId], ['Entra', d.relatedConvId]] as const).map(([rol, id]) => {
              const j = jugadores.find((x) => x.id === id)
              return j ? (
                <div key={rol} className="flex items-center gap-3">
                  <Rotulo>{rol}</Rotulo>
                  <AvatarJugador jugador={j} mostrarFoto={mostrarFoto} tam={48} />
                  <span className="text-base font-semibold">{j.etiqueta}</span>
                </div>
              ) : null
            })}
          </div>
        )}
        {esCambio && (
          <p className="text-[15px] text-muted-foreground">
            Aquí puedes corregir el minuto y la parte. Para cambiar quién sale o entra, elimina el cambio (se deshace en el campo) y anótalo de nuevo.
          </p>
        )}
      </div>
    </Hoja>
  )
}
