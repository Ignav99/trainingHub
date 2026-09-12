'use client'

import type { Ref } from 'react'
import { KitFullPreview } from '@/components/equipaciones/KitFullPreview'
import type { Equipacion } from '@/lib/api/equipaciones'
import type { CartelPlayer } from '@/lib/convocatoriaCartel'
import { formatFechaCartel, jornadaLabel } from '@/lib/convocatoriaCartel'

export interface ConvocatoriaCartelProps {
  clubNombre: string
  clubLogoUrl?: string | null
  rivalNombre: string
  rivalEscudoUrl?: string | null
  fecha?: string | null
  horaPartido?: string | null
  jornada?: number | null
  competicion?: string | null
  localia?: string | null
  lugarPartido: string
  horaCitacion: string
  lugarCitacion: string
  kitLabel: string
  kit: Equipacion | null
  players: CartelPlayer[]
  posterRef?: Ref<HTMLDivElement>
}

/** Cartel tipo hoja de vestuario / story. Colores en hex para export JPEG/PDF. */
export function ConvocatoriaCartel({
  clubNombre,
  clubLogoUrl,
  rivalNombre,
  rivalEscudoUrl,
  fecha,
  horaPartido,
  jornada,
  competicion,
  localia,
  lugarPartido,
  horaCitacion,
  lugarCitacion,
  kitLabel,
  kit,
  players,
  posterRef,
}: ConvocatoriaCartelProps) {
  const meta = jornadaLabel(jornada, competicion)
  const fechaTxt = formatFechaCartel(fecha)
  const vs = localia === 'visitante' ? '@' : 'vs'

  return (
    <div
      ref={posterRef}
      style={{
        width: 540,
        minHeight: 810,
        background: '#0B1F17',
        color: '#F3EFE4',
        fontFamily: '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
        padding: 28,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 18,
          border: '1px solid #D4E54E55',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -80,
          right: -60,
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: '#143528',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
        <Crest src={clubLogoUrl} name={clubNombre} />
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: 'Oswald, "Arial Narrow", Impact, sans-serif',
              fontSize: 13,
              letterSpacing: '0.35em',
              color: '#D4E54E',
              fontWeight: 500,
            }}
          >
            CONVOCATORIA
          </div>
          {meta ? (
            <div style={{ marginTop: 4, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.8 }}>
              {meta}
            </div>
          ) : null}
        </div>
        <Crest src={rivalEscudoUrl} name={rivalNombre} />
      </div>

      <div style={{ marginTop: 22, position: 'relative' }}>
        <div
          style={{
            fontFamily: 'Oswald, "Arial Narrow", Impact, sans-serif',
            fontSize: 34,
            lineHeight: 1.05,
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          {clubNombre}
        </div>
        <div style={{ color: '#D4E54E', fontSize: 12, letterSpacing: '0.28em', margin: '6px 0' }}>{vs}</div>
        <div
          style={{
            fontFamily: 'Oswald, "Arial Narrow", Impact, sans-serif',
            fontSize: 28,
            lineHeight: 1.05,
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          {rivalNombre}
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          fontSize: 12,
          letterSpacing: '0.04em',
        }}
      >
        <Meta label="Día" value={fechaTxt || '—'} />
        <Meta label="Hora del partido" value={horaPartido ? `${horaPartido} h` : '—'} />
        <Meta label="Lugar" value={lugarPartido || '—'} />
        <Meta label="Localía" value={localiaLabel(localia)} />
      </div>

      <div
        style={{
          marginTop: 16,
          background: '#D4E54E',
          color: '#0B1F17',
          padding: '12px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.22em', fontWeight: 700 }}>CITACIÓN JUGADORES</div>
          <div style={{ fontFamily: 'Oswald, "Arial Narrow", Impact, sans-serif', fontSize: 22, fontWeight: 700 }}>
            {horaCitacion || '—'} h
          </div>
        </div>
        <div style={{ textAlign: 'right', alignSelf: 'flex-end', fontSize: 12, fontWeight: 600, maxWidth: 220 }}>
          {lugarCitacion || 'Lugar de citación'}
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          borderTop: '1px solid #D4E54E33',
          borderBottom: '1px solid #D4E54E33',
          padding: '12px 0',
        }}
      >
        <div style={{ color: '#F3EFE4' }}>
          <KitFullPreview kit={kit} size={108} labels={false} escudoUrl={clubLogoUrl} />
        </div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.22em', color: '#D4E54E', fontWeight: 700 }}>EQUIPACIÓN</div>
          <div
            style={{
              fontFamily: 'Oswald, "Arial Narrow", Impact, sans-serif',
              fontSize: 20,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            {kitLabel}
          </div>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>Camiseta, calzonas y medias de Configuración</div>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 9, letterSpacing: '0.22em', color: '#D4E54E', fontWeight: 700 }}>
        CONVOCADOS · {players.length} · POR DORSAL
      </div>
      <div
        style={{
          marginTop: 8,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: 16,
          rowGap: 5,
        }}
      >
        {players.map((p, i) => (
          <div key={`${p.dorsal ?? 'x'}-${p.apellidos}-${i}`} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span
              style={{
                fontFamily: 'Oswald, "Arial Narrow", Impact, sans-serif',
                fontSize: 18,
                fontWeight: 700,
                color: '#D4E54E',
                width: 28,
                flexShrink: 0,
              }}
            >
              {p.dorsal ?? '—'}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {playerLine(p)}
              </span>
              {p.apodo ? (
                <span style={{ display: 'block', fontSize: 10, opacity: 0.65 }}>{p.apodo}</span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: '0.18em', color: '#D4E54E', fontWeight: 700 }}>{label.toUpperCase()}</div>
      <div style={{ marginTop: 2, fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{value}</div>
    </div>
  )
}

function Crest({ src, name }: { src?: string | null; name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  if (src) {
    return (
      // html2canvas captura <img> mejor que next/image
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={52}
        height={52}
        crossOrigin="anonymous"
        style={{ width: 52, height: 52, objectFit: 'contain', background: 'transparent' }}
      />
    )
  }
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 8,
        background: '#143528',
        border: '1px solid #D4E54E55',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 16,
      }}
    >
      {initials}
    </div>
  )
}

function playerLine(p: CartelPlayer): string {
  const full = `${p.nombre} ${p.apellidos}`.trim()
  return full || 'Jugador'
}

function localiaLabel(localia?: string | null): string {
  if (localia === 'visitante') return 'Visitante'
  if (localia === 'neutral') return 'Neutral'
  return 'Local'
}
