'use client'

import { TacticalBoardMini, boardHasAnimation } from '@/components/task-preview'
import type { ShowSlide } from '@/lib/dossierShow'
import { buildOncePitchTokens } from '@/lib/oncePitch'

export const DISPLAY_FONT = '"Archivo Narrow", "Arial Narrow", sans-serif'

// Crece con la pantalla y se detiene antes de llenarla. Título ~1,6× el cuerpo.
const SLIDE_TITLE = 'clamp(1.85rem, calc(1.4rem + 2.4vh), 3.6rem)'
const SLIDE_BODY = 'clamp(1.2rem, calc(1.15rem + 1.6vh), 2.15rem)'
const SLIDE_KICKER = 'clamp(0.8rem, calc(0.7rem + 0.7vh), 1.15rem)'
const SLIDE_META = 'clamp(1rem, calc(0.9rem + 0.85vh), 1.45rem)'
const PORTADA_TITLE = 'clamp(2.25rem, calc(1.6rem + 3vh), 4.75rem)'

export function ClubCrest({ src, size = 32 }: { src?: string; size?: number }) {
  if (!src) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      data-testid="dossier-club-crest"
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  )
}

export function PortadaSlide({ slide }: { slide: Extract<ShowSlide, { kind: 'portada' }> }) {
  return (
    <div data-testid="dossier-slide-portada" className="flex h-full flex-col justify-end pb-10">
      <p
        className="font-semibold uppercase tracking-[0.28em]"
        style={{ color: '#F0C35A', fontFamily: DISPLAY_FONT, fontSize: SLIDE_KICKER }}
      >
        {slide.kicker}
      </p>
      <div className="mt-3 flex items-center gap-4 sm:gap-6">
        {slide.rivalEscudoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slide.rivalEscudoUrl}
            alt=""
            data-testid="dossier-rival-crest"
            className="shrink-0 object-contain"
            style={{ width: 'clamp(3.5rem, 8vh, 6.25rem)', height: 'clamp(3.5rem, 8vh, 6.25rem)' }}
          />
        ) : null}
        <h1
          className="font-extrabold leading-[0.95] tracking-tight"
          style={{ fontFamily: DISPLAY_FONT, fontSize: PORTADA_TITLE }}
        >
          {slide.title}
        </h1>
      </div>
      {slide.subtitle && (
        <p className="mt-4" style={{ color: '#9AA59B', fontSize: SLIDE_META }}>
          {slide.subtitle}
        </p>
      )}
      {slide.meta.length > 0 && (
        <p className="mt-3 uppercase tracking-[0.14em]" style={{ color: '#C5CDC7', fontSize: SLIDE_KICKER }}>
          {slide.meta.join('  ·  ')}
        </p>
      )}
    </div>
  )
}

export function NotesSlide({
  slide,
}: {
  slide: Extract<ShowSlide, { kind: 'contexto' }>
}) {
  return (
    <div data-testid={`dossier-slide-${slide.kind}`} className="flex h-full min-h-0 flex-col justify-center overflow-y-auto py-4">
      <h2
        className="font-extrabold leading-none tracking-tight"
        style={{ fontFamily: DISPLAY_FONT, fontSize: SLIDE_TITLE }}
      >
        {slide.title}
      </h2>
      <ul className="mt-8 space-y-3">
        {slide.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-3 leading-snug break-words" style={{ fontSize: SLIDE_BODY }}>
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: '#F0C35A' }} />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function FaseSlide({ slide }: { slide: Extract<ShowSlide, { kind: 'fase' }> }) {
  const looping = boardHasAnimation(slide.board)
  const showBoard = Boolean(slide.board)

  return (
    <div
      data-testid="dossier-slide-fase"
      className={`grid h-full min-h-0 grid-cols-1 gap-6 overflow-y-auto py-4 ${showBoard ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]' : ''}`}
    >
      <div className="flex min-h-0 flex-col justify-center">
        <h2
          className="font-extrabold leading-none tracking-tight"
          style={{ fontFamily: DISPLAY_FONT, fontSize: SLIDE_TITLE }}
        >
          {slide.title}
        </h2>
        {slide.bullets.length > 0 ? (
          <ul className="mt-8 space-y-3">
            {slide.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-3 leading-snug break-words" style={{ fontSize: SLIDE_BODY }}>
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: '#F0C35A' }} />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 text-lg" style={{ color: '#9AA59B' }}>
            {showBoard ? 'Pizarra de esta fase' : 'Vídeo de esta fase'}
          </p>
        )}
      </div>
      {slide.board ? (
        <div
          className="flex min-h-0 items-center justify-center overflow-hidden rounded-md"
          style={{ background: '#1a3a12' }}
        >
          <TacticalBoardMini
            key={slide.id}
            data={slide.board}
            animate={looping}
            autoplay
            playerScale={1.38}
            height="100%"
            className="h-full w-full"
          />
        </div>
      ) : null}
    </div>
  )
}

export function OnceSlide({ slide }: { slide: Extract<ShowSlide, { kind: 'once' }> }) {
  const tokens = buildOncePitchTokens(slide.sistema, slide.colocacion, slide.jugadores)
  const showPitch = Boolean(slide.sistema) || tokens.some((token) => token.nombre)

  return (
    <div
      data-testid="dossier-slide-once"
      className={`grid h-full min-h-0 grid-cols-1 gap-6 overflow-y-auto py-4 ${showPitch && slide.bullets.length > 0 ? 'lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]' : ''}`}
    >
      <div className="flex min-h-0 flex-col justify-center">
        <h2
          className="font-extrabold leading-none tracking-tight"
          style={{ fontFamily: DISPLAY_FONT, fontSize: SLIDE_TITLE }}
        >
          {slide.title}
        </h2>
        {slide.sistema ? (
          <p className="mt-3 uppercase tracking-[0.14em]" style={{ color: '#F0C35A', fontFamily: DISPLAY_FONT, fontSize: SLIDE_META }}>
            {slide.sistema}
          </p>
        ) : null}
        {slide.bullets.length > 0 && (
          <ul className="mt-6 space-y-3">
            {slide.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-3 leading-snug break-words" style={{ fontSize: SLIDE_BODY }}>
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: '#F0C35A' }} />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {showPitch ? (
        <div className="flex min-h-0 items-center justify-center">
          <div
            data-testid="dossier-once-pitch"
            className="relative h-full w-full overflow-hidden rounded-md"
            style={{ aspectRatio: '4 / 3', background: '#1a3a12' }}
          >
            <div className="absolute inset-3">
              <div className="absolute inset-0 rounded border-2 border-white/25" />
              <div className="absolute top-0 bottom-0 left-1/2 border-l-2 border-white/25" />
              <div className="absolute top-1/2 left-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/25" />
              <div className="absolute left-0 top-1/2 h-2/3 w-[16%] -translate-y-1/2 border-2 border-l-0 border-white/25" />
              <div className="absolute right-0 top-1/2 h-2/3 w-[16%] -translate-y-1/2 border-2 border-r-0 border-white/25" />
            </div>
            {tokens.map((token) => (
              <div
                key={token.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
                style={{ top: `${token.topPct}%`, left: `${token.leftPct}%` }}
              >
                <div
                  className="mx-auto flex items-center justify-center rounded-full text-white shadow-md"
                  style={{ background: token.color, width: 'clamp(2.35rem, 5.2vh, 3.35rem)', height: 'clamp(2.35rem, 5.2vh, 3.35rem)' }}
                  aria-hidden
                >
                  <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="currentColor">
                    <circle cx="12" cy="7" r="3.1" />
                    <path d="M5.2 19.2c.7-3.3 3.3-5.2 6.8-5.2s6.1 1.9 6.8 5.2c.2.8-.4 1.5-1.2 1.5H6.4c-.8 0-1.4-.7-1.2-1.5z" />
                  </svg>
                </div>
                <span className="mt-0.5 block max-w-[7.5rem] whitespace-normal text-center font-semibold leading-tight text-white drop-shadow" style={{ fontSize: 'clamp(11px, 1.35vh, 15px)' }}>
                  {token.nombre || token.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function StaticSlideBody({ slide }: { slide: ShowSlide }) {
  if (slide.kind === 'portada') return <PortadaSlide slide={slide} />
  if (slide.kind === 'contexto') return <NotesSlide slide={slide} />
  if (slide.kind === 'once') return <OnceSlide slide={slide} />
  if (slide.kind === 'fase') return <FaseSlide slide={slide} />
  return null
}
