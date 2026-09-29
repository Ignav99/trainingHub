'use client'

import { useEffect, useRef, useState } from 'react'
import { TacticalBoardMini, boardHasAnimation } from '@/components/task-preview'
import type { ShowSlide } from '@/lib/dossierShow'
import type { IntelResultadoVisual } from '@/lib/pdf/informeRivalPdfBlocks'
import { buildOncePitchTokens } from '@/lib/oncePitch'

export const DISPLAY_FONT = '"Archivo Narrow", "Arial Narrow", sans-serif'

// Tamaño fijo del escenario 16:9. La tablet y la tele escalan el mismo lienzo.
const STAGE_W = 1280
const STAGE_H = 720
const SLIDE_TITLE = '44px'
const SLIDE_BODY = '22px'
const SLIDE_KICKER = '16px'
const SLIDE_META = '18px'
const PORTADA_TITLE = '72px'

const PITCH_ICONS = { muro: '🧱', correcaminos: '🏃', bombilla: '💡' } as const

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
            style={{ width: 96, height: 96 }}
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

function CrestMark({ src, name }: { src?: string; name: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className="h-8 w-8 object-contain" />
    )
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-xs font-bold">
      {(name || '?').slice(0, 1).toUpperCase()}
    </span>
  )
}

function crestForSide(name: string, own: string | undefined, rivalNombre: string | undefined, rivalEscudoUrl: string | undefined) {
  if (own) return own
  const rival = (rivalNombre || '').trim().toLowerCase()
  const team = name.trim().toLowerCase()
  if (rival && team && (team.includes(rival) || rival.includes(team))) return rivalEscudoUrl
  return undefined
}

export function ResultadoPills({
  resultados,
  rivalNombre,
  rivalEscudoUrl,
  tone = 'dark',
}: {
  resultados: IntelResultadoVisual[]
  rivalNombre?: string
  rivalEscudoUrl?: string
  tone?: 'dark' | 'light'
}) {
  const light = tone === 'light'
  return (
    <div className="flex flex-wrap gap-2">
      {resultados.slice(0, 5).map((row) => (
        <div
          key={`${row.local}-${row.visitante}-${row.golesLocal}-${row.golesVisitante}`}
          className={light
            ? 'flex items-center gap-2 rounded-xl border bg-muted/40 px-2.5 py-1.5'
            : 'flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5'}
        >
          <CrestMark src={crestForSide(row.local, row.localEscudo, rivalNombre, rivalEscudoUrl)} name={row.local} />
          <span className="font-extrabold tabular-nums" style={{ fontFamily: DISPLAY_FONT, fontSize: light ? '14px' : '22px' }}>
            {row.golesLocal} - {row.golesVisitante}
          </span>
          <CrestMark src={crestForSide(row.visitante, row.visitanteEscudo, rivalNombre, rivalEscudoUrl)} name={row.visitante} />
        </div>
      ))}
    </div>
  )
}

export function NotesSlide({
  slide,
  rivalNombre,
  rivalEscudoUrl,
}: {
  slide: Extract<ShowSlide, { kind: 'contexto' }>
  rivalNombre?: string
  rivalEscudoUrl?: string
}) {
  const visual = slide.visual
  const maxChart = Math.max(1, ...(visual?.charts ?? []).flatMap((chart) => [chart.gf, chart.gc]))
  return (
    <div data-testid={`dossier-slide-${slide.kind}`} className="flex h-full min-h-0 flex-col overflow-hidden py-6">
      <h2
        className="font-extrabold leading-none tracking-tight"
        style={{ fontFamily: DISPLAY_FONT, fontSize: SLIDE_TITLE }}
      >
        {slide.title}
      </h2>
      {visual?.posicion ? (
        <p className="mt-3 font-bold" style={{ color: '#F0C35A', fontSize: SLIDE_META }}>
          {visual.posicion}º{visual.puntos != null ? ` · ${visual.puntos} pts` : ''}
        </p>
      ) : null}
      {visual && visual.resultados.length > 0 ? (
        <div className="mt-4">
          <ResultadoPills resultados={visual.resultados} rivalNombre={rivalNombre} rivalEscudoUrl={rivalEscudoUrl} />
        </div>
      ) : null}
      {visual && visual.charts.length > 0 ? (
        <div className="mt-5 grid grid-cols-4 gap-3">
          {visual.charts.map((chart) => (
            <div key={chart.label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="font-bold" style={{ fontSize: '16px' }}>{chart.label}</p>
              <div className="mt-2 flex h-24 items-end gap-2">
                <div className="flex flex-1 flex-col items-center justify-end gap-1">
                  <div className="w-full rounded-t bg-emerald-500" style={{ height: `${(chart.gf / maxChart) * 100}%`, minHeight: chart.gf ? 6 : 0 }} />
                  <span className="text-emerald-300 text-xs font-bold">{chart.gf}</span>
                </div>
                <div className="flex flex-1 flex-col items-center justify-end gap-1">
                  <div className="w-full rounded-t bg-red-500" style={{ height: `${(chart.gc / maxChart) * 100}%`, minHeight: chart.gc ? 6 : 0 }} />
                  <span className="text-red-300 text-xs font-bold">{chart.gc}</span>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-white/50">GF · GC</p>
            </div>
          ))}
        </div>
      ) : null}
      {visual && visual.goleadores.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {visual.goleadores.map((row) => (
            <span
              key={row.nombre}
              className="rounded-lg px-2.5 py-1 font-bold"
              style={{ fontSize: '16px', color: '#FDE68A', background: 'rgba(240,195,90,0.16)', border: '1px solid rgba(240,195,90,0.45)' }}
            >
              {row.nombre} · {row.goles}
            </span>
          ))}
        </div>
      ) : null}
      {visual && (visual.sancionados.length > 0 || visual.apercibidos.length > 0) ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {visual.sancionados.map((name) => (
            <span key={name} className="rounded-lg px-2.5 py-1 font-semibold" style={{ fontSize: '15px', color: '#FECACA', background: 'rgba(239,68,68,0.22)', border: '1px solid #F87171' }}>
              {name}
            </span>
          ))}
          {visual.apercibidos.map((name) => (
            <span key={name} className="rounded-lg px-2.5 py-1 font-semibold" style={{ fontSize: '15px', color: '#FDE68A', background: 'rgba(245,158,11,0.18)', border: '1px solid #F59E0B' }}>
              {name}
            </span>
          ))}
        </div>
      ) : null}
      {slide.bullets.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {slide.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-3 leading-snug break-words" style={{ fontSize: SLIDE_BODY }}>
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: '#F0C35A' }} />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function TagChips({ items, tone }: { items: string[]; tone: 'good' | 'bad' }) {
  if (items.length === 0) return null
  const good = tone === 'good'
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-lg px-2.5 py-1 font-semibold leading-tight"
          style={{
            fontSize: '18px',
            color: good ? '#BBF7D0' : '#FECACA',
            background: good ? 'rgba(16,185,129,0.22)' : 'rgba(239,68,68,0.22)',
            border: `1px solid ${good ? '#34D399' : '#F87171'}`,
          }}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

export function FaseSlide({ slide }: { slide: Extract<ShowSlide, { kind: 'fase' }> }) {
  const looping = boardHasAnimation(slide.board)
  const showBoard = Boolean(slide.board)
  const showPlaceholder = slide.bullets.length === 0 && !(slide.fortalezas?.length) && !(slide.debilidades?.length)

  return (
    <div
      data-testid="dossier-slide-fase"
      className={`grid h-full min-h-0 grid-cols-1 gap-6 overflow-hidden py-6 ${showBoard ? 'grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]' : ''}`}
    >
      <div className="flex min-h-0 flex-col justify-center">
        <h2
          className="font-extrabold leading-none tracking-tight"
          style={{ fontFamily: DISPLAY_FONT, fontSize: SLIDE_TITLE }}
        >
          {slide.title}
        </h2>
        {slide.bullets.length > 0 ? (
          <ul className="mt-5 space-y-2">
            {slide.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-3 leading-snug break-words" style={{ fontSize: SLIDE_BODY }}>
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: '#F0C35A' }} />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <TagChips items={slide.fortalezas ?? []} tone="good" />
        <TagChips items={slide.debilidades ?? []} tone="bad" />
        {showPlaceholder ? (
          <p className="mt-8 text-lg" style={{ color: '#9AA59B' }}>
            {showBoard ? 'Pizarra de esta fase' : 'Vídeo de esta fase'}
          </p>
        ) : null}
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
      className="grid h-full min-h-0 grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] gap-6 overflow-hidden py-6"
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
        <p className="mt-4 max-w-xs leading-snug" style={{ color: '#9AA59B', fontSize: '18px' }}>
          🧱 muro · 🏃 correcaminos · 💡 bombilla
        </p>
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
                  style={{ background: token.color, width: 52, height: 52 }}
                  aria-hidden
                >
                  {token.dorsal ? (
                    <span className="font-extrabold tabular-nums leading-none" style={{ fontSize: '20px' }}>
                      {token.dorsal}
                    </span>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="currentColor">
                      <circle cx="12" cy="7" r="3.1" />
                      <path d="M5.2 19.2c.7-3.3 3.3-5.2 6.8-5.2s6.1 1.9 6.8 5.2c.2.8-.4 1.5-1.2 1.5H6.4c-.8 0-1.4-.7-1.2-1.5z" />
                    </svg>
                  )}
                </div>
                <span className="mt-0.5 block max-w-[7.5rem] whitespace-normal text-center font-semibold leading-tight text-white drop-shadow" style={{ fontSize: '14px' }}>
                  {token.nombre || token.label}
                </span>
                {token.icons && token.icons.length > 0 ? (
                  <span className="mt-0.5 block text-center" style={{ fontSize: '16px' }}>
                    {token.icons.map((icon) => PITCH_ICONS[icon]).join('')}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function StaticSlideBody({
  slide,
  rivalNombre,
  rivalEscudoUrl,
}: {
  slide: ShowSlide
  rivalNombre?: string
  rivalEscudoUrl?: string
}) {
  if (slide.kind === 'portada') return <PortadaSlide slide={slide} />
  if (slide.kind === 'contexto') {
    return <NotesSlide slide={slide} rivalNombre={rivalNombre} rivalEscudoUrl={rivalEscudoUrl} />
  }
  if (slide.kind === 'once') return <OnceSlide slide={slide} />
  if (slide.kind === 'fase') return <FaseSlide slide={slide} />
  return null
}

export function FitSlideStage({ children }: { children: React.ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: STAGE_W, h: STAGE_H })

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const scale = box.w > 0 && box.h > 0 ? Math.min(box.w / STAGE_W, box.h / STAGE_H) : 1
  const left = Math.max(0, (box.w - STAGE_W * scale) / 2)
  const top = Math.max(0, (box.h - STAGE_H * scale) / 2)

  return (
    <div ref={frameRef} className="relative h-full w-full overflow-hidden">
      <div
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `translate(${left}px, ${top}px) scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  )
}
