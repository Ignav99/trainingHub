'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Film, X } from 'lucide-react'
import { VideoPlayer, type VideoPlayerHandle } from '@/components/video-analyzer/VideoPlayer'
import { TacticalBoardMini, boardHasAnimation } from '@/components/task-preview'
import {
  chapterIndexForSlide,
  showChapters,
  type DossierShow,
  type ShowSlide,
} from '@/lib/dossierShow'

interface DossierPresenterProps {
  show: DossierShow
  onClose: () => void
}

const DISPLAY_FONT = '"Archivo Narrow", "Arial Narrow", sans-serif'

export function DossierPresenter({ show, onClose }: DossierPresenterProps) {
  const [index, setIndex] = useState(0)
  const [videoFailed, setVideoFailed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  const slides = show.slides
  const slide = slides[index] ?? slides[0]
  const chapters = useMemo(() => showChapters(slides), [slides])
  const chapterIdx = chapterIndexForSlide(chapters, index)
  const total = slides.length

  const go = useCallback(
    (delta: number) => {
      setIndex((current) => {
        const next = current + delta
        if (next < 0 || next >= slides.length) return current
        return next
      })
    },
    [slides.length]
  )

  const jump = useCallback((to: number) => {
    if (to < 0 || to >= slides.length) return
    setIndex(to)
  }, [slides.length])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    rootRef.current?.focus()
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [mounted])

  useEffect(() => {
    setVideoFailed(false)
  }, [index, slide?.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        go(1)
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        go(-1)
        return
      }
      if (e.key === 'Home') {
        e.preventDefault()
        jump(0)
        return
      }
      if (e.key === 'End') {
        e.preventDefault()
        jump(slides.length - 1)
        return
      }
      if (e.key === ' ' && slide?.kind !== 'video') {
        e.preventDefault()
        go(1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, jump, onClose, slide?.kind, slides.length])

  if (!mounted || typeof document === 'undefined' || !slide) return null

  const hint =
    slide.kind === 'video'
      ? 'Espacio reproduce · ← → pasa diapositiva · Esc cierra'
      : '← → pasa diapositiva · Espacio siguiente · Esc cierra'

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={show.kind === 'plan' ? 'Presentar plan de partido' : 'Presentar informe rival'}
      data-testid="dossier-presenter"
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col outline-none"
      style={{ background: '#08110F', color: '#F3EFE6' }}
      onTouchStart={(e) => {
        touchStartX.current = e.changedTouches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current
        touchStartX.current = null
        const end = e.changedTouches[0]?.clientX
        if (start == null || end == null) return
        const delta = end - start
        if (Math.abs(delta) < 60) return
        go(delta < 0 ? 1 : -1)
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@600;700;800&display=swap');
        @media (prefers-reduced-motion: reduce) {
          .dossier-slide { transition: none !important; }
        }
      `}</style>

      <header className="flex items-center gap-3 px-4 py-3 sm:px-6">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.28em]"
          style={{ color: '#F0C35A', fontFamily: DISPLAY_FONT }}
        >
          {slide.kicker}
        </p>
        <div className="h-px flex-1" style={{ background: '#2A3A34' }} />
        <p className="tabular-nums text-xs" style={{ color: '#9AA59B' }}>
          {index + 1} / {total}
        </p>
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#F3EFE6] hover:bg-white/10 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C35A]"
          aria-label="Diapositiva anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === total - 1}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#F3EFE6] hover:bg-white/10 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C35A]"
          aria-label="Diapositiva siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#F3EFE6] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C35A]"
          aria-label="Cerrar presentación"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        <div className="dossier-slide flex h-full min-h-0 flex-col px-6 pb-2 sm:px-12">
          {slide.kind === 'portada' && <PortadaSlide slide={slide} />}
          {(slide.kind === 'contexto' || slide.kind === 'once') && <NotesSlide slide={slide} />}
          {slide.kind === 'fase' && <FaseSlide slide={slide} />}
          {slide.kind === 'video' && (
            <VideoSlide
              key={slide.id}
              slide={slide}
              failed={videoFailed}
              onError={() => setVideoFailed(true)}
              onSkip={() => go(1)}
            />
          )}
        </div>
      </div>

      <footer className="shrink-0 px-3 pb-3 pt-1 sm:px-5">
        <div
          className="flex items-center gap-1 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Fases de la charla"
        >
          {chapters.map((chapter, i) => {
            const active = i === chapterIdx
            return (
              <button
                key={chapter.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => jump(chapter.startIndex)}
                className="flex shrink-0 items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C35A]"
                style={{
                  background: active ? '#F0C35A' : '#12201B',
                  color: active ? '#08110F' : '#C5CDC7',
                  fontFamily: DISPLAY_FONT,
                }}
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.12em]">{chapter.label}</span>
                {chapter.videoCount > 0 && (
                  <Film className="h-3 w-3" aria-hidden />
                )}
              </button>
            )
          })}
        </div>
        <div className="mt-1 flex items-center justify-between gap-3 text-[11px]" style={{ color: '#9AA59B' }}>
          <span>{hint}</span>
          <span className="flex items-center gap-2">
            <ChevronLeft className="h-3 w-3" />
            <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </footer>
    </div>,
    document.body
  )
}

function PortadaSlide({ slide }: { slide: Extract<ShowSlide, { kind: 'portada' }> }) {
  return (
    <div data-testid="dossier-slide-portada" className="flex h-full flex-col justify-end pb-10">
      <p
        className="text-sm font-semibold uppercase tracking-[0.35em]"
        style={{ color: '#F0C35A', fontFamily: DISPLAY_FONT }}
      >
        {slide.kicker}
      </p>
      <h1
        className="mt-3 max-w-[16ch] text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl"
        style={{ fontFamily: DISPLAY_FONT }}
      >
        {slide.title}
      </h1>
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

function NotesSlide({
  slide,
}: {
  slide: Extract<ShowSlide, { kind: 'contexto' | 'once' }>
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

function FaseSlide({ slide }: { slide: Extract<ShowSlide, { kind: 'fase' }> }) {
  const looping = boardHasAnimation(slide.board)
  const showBoard = Boolean(slide.board) || Boolean(slide.boardSrc)

  return (
    <div data-testid="dossier-slide-fase" className="grid h-full min-h-0 grid-cols-1 gap-6 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
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
      ) : slide.boardSrc ? (
        <div className="flex min-h-0 items-center justify-center">
          <img
            src={slide.boardSrc}
            alt={`Pizarra de ${slide.title}`}
            className="max-h-full w-full object-contain"
          />
        </div>
      ) : null}
    </div>
  )
}

function VideoSlide({
  slide,
  failed,
  onError,
  onSkip,
}: {
  slide: Extract<ShowSlide, { kind: 'video' }>
  failed: boolean
  onError: () => void
  onSkip: () => void
}) {
  const playerRef = useRef<VideoPlayerHandle>(null)

  useEffect(() => {
    const id = window.setTimeout(() => {
      playerRef.current?.play()
    }, 80)
    return () => {
      clearTimeout(id)
      playerRef.current?.pause()
    }
  }, [slide.src])

  return (
    <div data-testid="dossier-slide-video" className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-end justify-between gap-3">
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl" style={{ fontFamily: DISPLAY_FONT }}>
          {slide.title}
        </h2>
        <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: '#9AA59B' }}>
          {slide.kicker}
        </span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-md" style={{ background: '#000' }}>
        {failed ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-xl font-bold" style={{ fontFamily: DISPLAY_FONT, color: '#E35D4A' }}>
              Clip no disponible
            </p>
            <p className="text-sm" style={{ color: '#9AA59B' }}>
              Este recorte no se puede reproducir. Pasa a la siguiente diapositiva.
            </p>
            <button
              type="button"
              onClick={onSkip}
              className="rounded-md px-4 py-2 text-sm font-semibold"
              style={{ background: '#F0C35A', color: '#08110F', fontFamily: DISPLAY_FONT }}
            >
              Siguiente
            </button>
          </div>
        ) : (
          <div className="relative h-full min-h-0">
            <VideoPlayer ref={playerRef} src={slide.src} standalonePreview presenterEmbed onError={onError} />
          </div>
        )}
      </div>
    </div>
  )
}
