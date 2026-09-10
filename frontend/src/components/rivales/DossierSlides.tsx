'use client'

import { TacticalBoardMini, boardHasAnimation } from '@/components/task-preview'
import type { ShowSlide } from '@/lib/dossierShow'
import { buildOncePitchTokens } from '@/lib/oncePitch'

export const DISPLAY_FONT = '"Archivo Narrow", "Arial Narrow", sans-serif'

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
        className="text-sm font-semibold uppercase tracking-[0.35em]"
        style={{ color: '#F0C35A', fontFamily: DISPLAY_FONT }}
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
            className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20"
          />
        ) : null}
        <h1
          className="max-w-[16ch] text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl"
          style={{ fontFamily: DISPLAY_FONT }}
        >
          {slide.title}
        </h1>
      </div>
      {slide.subtitle && (
        <p className="mt-4 text-lg" style={{ color: '#9AA59B' }}>
          {slide.subtitle}
        </p>
      )}
      {slide.meta.length > 0 && (
        <p className="mt-3 text-sm uppercase tracking-[0.18em]" style={{ color: '#C5CDC7' }}>
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
    <div data-testid={`dossier-slide-${slide.kind}`} className="flex h-full min-h-0 flex-col justify-center py-4">
      <h2
        className="text-4xl font-extrabold leading-none tracking-tight sm:text-6xl"
        style={{ fontFamily: DISPLAY_FONT }}
      >
        {slide.title}
      </h2>
      <ul className="mt-8 max-w-3xl space-y-3">
        {slide.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-3 text-lg leading-snug sm:text-xl">
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
      className={`grid h-full min-h-0 grid-cols-1 gap-6 py-4 ${showBoard ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]' : ''}`}
    >
      <div className="flex min-h-0 flex-col justify-center">
        <h2
          className="text-4xl font-extrabold leading-none tracking-tight sm:text-6xl"
          style={{ fontFamily: DISPLAY_FONT }}
        >
          {slide.title}
        </h2>
        {slide.bullets.length > 0 ? (
          <ul className="mt-8 space-y-3">
            {slide.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-3 text-lg leading-snug sm:text-xl">
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
      className={`grid h-full min-h-0 grid-cols-1 gap-6 py-4 ${showPitch && slide.bullets.length > 0 ? 'lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]' : ''}`}
    >
      <div className="flex min-h-0 flex-col justify-center">
        <h2
          className="text-4xl font-extrabold leading-none tracking-tight sm:text-6xl"
          style={{ fontFamily: DISPLAY_FONT }}
        >
          {slide.title}
        </h2>
        {slide.sistema ? (
          <p className="mt-3 text-lg uppercase tracking-[0.18em]" style={{ color: '#F0C35A', fontFamily: DISPLAY_FONT }}>
            {slide.sistema}
          </p>
        ) : null}
        {slide.bullets.length > 0 && (
          <ul className="mt-6 space-y-3">
            {slide.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-3 text-lg leading-snug sm:text-xl">
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
            className="relative w-full max-w-3xl overflow-hidden rounded-md"
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
                  className="mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-md"
                  style={{ background: token.color }}
                >
                  {token.dorsal || (token.nombre ? token.nombre.slice(0, 1) : token.label)}
                </div>
                <span className="mt-0.5 block max-w-[72px] truncate text-[11px] font-semibold text-white drop-shadow">
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
