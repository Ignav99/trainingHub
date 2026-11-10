'use client'

import { Camera, Loader2, Pencil, Save, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Ficha } from '@/components/ui/ficha'
import { Estado } from '@/components/ui/estado'
import { ExportarInformeButton } from '@/components/informes/ExportarInformeButton'
import { PlayerAvatar } from '@/components/player/PlayerAvatar'
import { POSICIONES, type Jugador } from '@/lib/api/jugadores'
import { detalleEstado, estadoDe } from '@/components/plantilla/PlantillaTablaCal'

interface Props {
  jugador: Jugador
  isEditing: boolean
  saving: boolean
  uploadingPhoto: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  onDelete: () => void
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onPhotoDelete: () => void
}

const PIE: Record<string, string> = {
  derecha: 'pie derecho',
  izquierda: 'pie izquierdo',
  ambas: 'ambidiestro',
}

const cifra = (v?: number | null) => (v === undefined || v === null ? '–' : v)

/** Cabecera de la ficha de jugador en Cal: persona y estado a la izquierda, cifras a la derecha. */
export function JugadorCabeceraCal({
  jugador,
  isEditing,
  saving,
  uploadingPhoto,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  onPhotoUpload,
  onPhotoDelete,
}: Props) {
  const nombre = jugador.apodo || `${jugador.nombre} ${jugador.apellidos}`
  const pos = POSICIONES[jugador.posicion_principal as keyof typeof POSICIONES]
  const est = estadoDe(jugador)
  const detalle = detalleEstado(jugador)
  const pie = PIE[jugador.pierna_dominante]

  const datos: Array<string | null> = [
    jugador.edad ? `${jugador.edad} años` : null,
    pie ?? null,
    jugador.es_capitan ? 'capitán' : null,
  ]

  const cifras = [
    { rotulo: 'Media', largo: 'Nivel global', valor: jugador.nivel_global },
    { rotulo: 'TEC', largo: 'Técnico', valor: jugador.nivel_tecnico },
    { rotulo: 'TAC', largo: 'Táctico', valor: jugador.nivel_tactico },
    { rotulo: 'FIS', largo: 'Físico', valor: jugador.nivel_fisico },
    { rotulo: 'MEN', largo: 'Mental', valor: jugador.nivel_mental },
  ]

  const fotoBtn =
    'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--radius)] border-[1.5px] border-line px-3 text-sm font-semibold text-foreground hover:bg-sunken focus-within:outline focus-within:outline-2 focus-within:outline-primary'

  return (
    <section className="cal-linea bg-card" aria-label="Jugador">
      <div className="grid grid-cols-1 lg:grid-cols-carriles">
        <div className="min-w-0 p-4 sm:p-5 lg:col-span-3">
          <div className="flex items-start gap-4">
            <div className="relative h-24 w-24 flex-none sm:h-28 sm:w-28">
              <div
                className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full border-[1.5px] border-line bg-card text-foreground ${
                  est.ficha === 'duda' ? 'border-dashed' : ''
                } ${est.ficha === 'baja' ? 'text-muted-foreground' : ''}`}
              >
                {jugador.foto_url ? (
                  <PlayerAvatar player={jugador} size="3xl" className="h-full w-full" />
                ) : (
                  <span className="cal-titulo text-4xl tabular-nums sm:text-5xl" aria-label={`Dorsal ${jugador.dorsal ?? 'sin asignar'}`}>
                    {jugador.dorsal ?? '–'}
                  </span>
                )}
              </div>
              {jugador.foto_url && jugador.dorsal != null && (
                <Ficha dorsal={jugador.dorsal} estado={est.ficha} size="sm" label={nombre} className="absolute -bottom-1 -right-1" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="cal-titulo break-words text-2xl text-foreground sm:text-3xl">{nombre}</h1>
              {jugador.apodo && (
                <p className="text-sm text-muted-foreground">
                  {jugador.nombre} {jugador.apellidos}
                </p>
              )}
              <p className="mt-2 text-sm text-foreground">
                <span className="font-mono text-xs">{jugador.posicion_principal}</span>
                {pos?.nombre && <span> {pos.nombre}</span>}
                {datos.filter(Boolean).map((d) => (
                  <span key={d} className="text-muted-foreground tabular-nums">
                    {' · '}
                    {d}
                  </span>
                ))}
              </p>
              <p className="mt-2 text-sm">
                <Estado tipo={est.tipo}>{est.texto}</Estado>
                {detalle && <span className="text-muted-foreground"> · {detalle}</span>}
              </p>
            </div>
          </div>
        </div>
        <dl className="m-0 grid min-w-0 grid-cols-5 content-center gap-2 border-t border-border p-4 sm:p-5 lg:col-span-2 lg:border-l lg:border-t-0">
          {cifras.map((c) => (
            <div key={c.rotulo} className="min-w-0" title={c.largo}>
              <dt className="cal-rotulo text-muted-foreground">{c.rotulo}</dt>
              <dd className="cal-titulo m-0 mt-1 text-3xl tabular-nums text-foreground">{cifra(c.valor)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border p-3 sm:px-5 lg:justify-end">
        <label className={fotoBtn} title="Subir o cambiar foto">
          {uploadingPhoto ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Camera className="h-4 w-4" aria-hidden="true" />
          )}
          {jugador.foto_url ? 'Cambiar foto' : 'Subir foto'}
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="sr-only"
            onChange={onPhotoUpload}
            disabled={uploadingPhoto}
          />
        </label>
        {jugador.foto_url && (
          <Button variant="outline" className="min-h-10" onClick={onPhotoDelete} disabled={uploadingPhoto}>
            <X className="mr-2 h-4 w-4" aria-hidden="true" />
            Quitar foto
          </Button>
        )}
        <span className="flex-1" />
        {isEditing ? (
          <>
            <Button variant="outline" className="min-h-10" onClick={onCancel}>
              Cancelar
            </Button>
            <Button className="min-h-10" onClick={onSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Guardar
            </Button>
          </>
        ) : (
          <>
            <ExportarInformeButton tipo="jugador" jugadorId={jugador.id} label="Exportar ficha" />
            <Button variant="outline" className="min-h-10 text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Eliminar
            </Button>
            <Button className="min-h-10" onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Editar
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
